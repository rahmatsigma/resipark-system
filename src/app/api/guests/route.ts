import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity';
import { isVehicleBlacklisted, checkParkingCapacityByType, getSlotTypeByVehicle, getAvailableSlotByType, validatePlatNumber } from '@/lib/rules';
import { logger } from '@/lib/logger';

const DEFAULT_GUEST_PAGE_SIZE = 6;
const ALLOWED_VEHICLE_TYPES = new Set(['MOTOR', 'SEDAN', 'MINIBUS', 'PICKUP', 'TRUK']);

function normalizeVehicleType(vehicleType: unknown): 'MOTOR' | 'SEDAN' | 'MINIBUS' | 'PICKUP' | 'TRUK' {
  const normalized = typeof vehicleType === 'string' ? vehicleType.toUpperCase().trim() : 'MOTOR';

  if (ALLOWED_VEHICLE_TYPES.has(normalized)) {
    return normalized as 'MOTOR' | 'SEDAN' | 'MINIBUS' | 'PICKUP' | 'TRUK';
  }

  return 'MOTOR';
}

// GET - List guests
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'SATPAM' && user.role !== 'ADMIN')) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tidak memiliki akses' }
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const limit = Math.min(24, Math.max(1, Number(searchParams.get('limit') || String(DEFAULT_GUEST_PAGE_SIZE))));
    const skip = (page - 1) * limit;

    const [total, guests] = await Promise.all([
      db.guestAccess.count(),
      db.guestAccess.findMany({
        include: {
          accessRecord: {
            include: {
              vehicle: true,
            },
          },
          hostHouse: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);

    if (safePage !== page) {
      const correctedGuests = await db.guestAccess.findMany({
        include: {
          accessRecord: {
            include: {
              vehicle: true,
            },
          },
          hostHouse: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * limit,
        take: limit,
      });

      return NextResponse.json({
        success: true,
        data: correctedGuests,
        pagination: {
          page: safePage,
          limit,
          total,
          totalPages,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: guests,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    logger.error('Get guests error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}

// POST - Create guest access
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'SATPAM' && user.role !== 'ADMIN')) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tidak memiliki akses' }
      }, { status: 401 });
    }

    const body = await request.json();
    const { platNumber, vehicleType, brand, color, hostHouseNumber, purpose, maxDurationHours } = body;

    if (!platNumber || !hostHouseNumber || !purpose || maxDurationHours === undefined || maxDurationHours === null) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Data tidak lengkap, termasuk durasi parkir tamu' }
      }, { status: 400 });
    }

    const parsedDurationHours = Number(maxDurationHours);
    if (!Number.isInteger(parsedDurationHours) || parsedDurationHours < 1) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_HOURS', message: 'Durasi parkir tamu harus berupa angka bulat minimal 1 jam' }
      }, { status: 400 });
    }

    const platValidation = validatePlatNumber(platNumber);
    if (!platValidation.valid) {
      return NextResponse.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: platValidation.error }
      }, { status: 400 });
    }

    const formattedPlat = platNumber.toUpperCase().trim();
    const normalizedVehicleType = normalizeVehicleType(vehicleType);

    // Find host house
    const hostHouse = await db.house.findFirst({
      where: { houseNumber: hostHouseNumber },
    });

    if (!hostHouse) {
      return NextResponse.json({
        success: false,
        error: { code: 'HOUSE_NOT_FOUND', message: 'Rumah tuan rumah tidak ditemukan' }
      }, { status: 404 });
    }

    // Check if vehicle exists or create new
    let vehicle = await db.vehicle.findUnique({
      where: { platNumber: formattedPlat },
    });

    if (!vehicle) {
      // Create new guest vehicle
      vehicle = await db.vehicle.create({
        data: {
          platNumber: formattedPlat,
          brand: brand || 'Tamu',
          color: color || 'Tidak diketahui',
          vehicleType: normalizedVehicleType,
          category: 'TAMU',
          status: 'ACTIVE',
        },
      });
    }

    // Check blacklist
    const blacklistStatus = await isVehicleBlacklisted(vehicle.id);
    if (blacklistStatus.isBlacklisted) {
      return NextResponse.json({
        success: false,
        error: { 
          code: 'VEHICLE_BLACKLISTED', 
          message: 'Kendaraan ini DILARANG MASUK',
          details: { reason: blacklistStatus.reason }
        }
      }, { status: 403 });
    }

    // If this plate already has an active guest session, overwrite guest data and duration only.
    const activeGuestSession = await db.accessRecord.findFirst({
      where: {
        vehicleId: vehicle.id,
        status: 'ACTIVE',
        guestAccess: { isNot: null },
      },
      include: {
        guestAccess: {
          include: {
            accessRecord: {
              include: { vehicle: true },
            },
            hostHouse: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeGuestSession?.guestAccess) {
      const updatedGuest = await db.$transaction(async (tx) => {
        await tx.vehicle.update({
          where: { id: vehicle!.id },
          data: {
            brand: brand || vehicle!.brand,
            color: color || vehicle!.color,
            vehicleType: vehicle!.category === 'TAMU' ? normalizedVehicleType : vehicle!.vehicleType,
            category: 'TAMU',
            status: 'ACTIVE',
            houseId: null,
            userId: null,
          },
        });

        return tx.guestAccess.update({
          where: { id: activeGuestSession.guestAccess!.id },
          data: {
            hostHouseId: hostHouse.id,
            purpose,
            maxDurationHours: parsedDurationHours,
            expiredAt: new Date(Date.now() + parsedDurationHours * 60 * 60 * 1000),
          },
          include: {
            accessRecord: {
              include: { vehicle: true },
            },
            hostHouse: true,
          },
        });
      });

      await logActivity({
        userId: user.id,
        action: ACTIVITY_TYPES.GUEST_EXTEND.action,
        module: ACTIVITY_TYPES.GUEST_EXTEND.module,
        description: `Timpa data tamu aktif: ${formattedPlat}`,
        details: {
          guestId: updatedGuest.id,
          hostHouse: hostHouse.houseNumber,
          maxDurationHours: parsedDurationHours,
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedGuest,
      }, { status: 200 });
    }

    if (vehicle.category === 'TAMU') {
      vehicle = await db.vehicle.update({
        where: { id: vehicle.id },
        data: {
          brand: brand || vehicle.brand,
          color: color || vehicle.color,
          vehicleType: normalizedVehicleType,
          status: 'ACTIVE',
          houseId: null,
          userId: null,
        },
      });
    }

    const slotType = getSlotTypeByVehicle(normalizedVehicleType);

    // Check parking capacity by vehicle group so motor/mobil availability is respected
    const capacity = await checkParkingCapacityByType('guest-parking', slotType);
    if (!capacity.available) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PARKING_FULL',
          message: `Area parkir tamu ${slotType === 'MOTOR' ? 'motor' : 'mobil'} penuh`
        }
      }, { status: 503 });
    }

    const slotInfo = await getAvailableSlotByType('guest-parking', slotType);
    if (!slotInfo) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PARKING_FULL',
          message: `Tidak ada slot parkir tersedia untuk ${slotType === 'MOTOR' ? 'motor' : 'mobil'}`
        }
      }, { status: 503 });
    }

    const { id: slotId, slotNumber } = slotInfo;

    // Create access record and guest access in transaction
    const result = await db.$transaction(async (tx) => {
      // Create access record
      const accessRecord = await tx.accessRecord.create({
        data: {
          vehicleId: vehicle!.id,
          entryTime: new Date(),
          slotNumber,
          areaId: 'guest-parking',
          operatorId: user.id,
          status: 'ACTIVE',
        },
      });

      // Create guest access
      const guestAccess = await tx.guestAccess.create({
        data: {
          accessRecordId: accessRecord.id,
          hostHouseId: hostHouse.id,
          purpose,
          maxDurationHours: parsedDurationHours,
          expiredAt: new Date(Date.now() + parsedDurationHours * 60 * 60 * 1000),
        },
        include: {
          accessRecord: {
            include: { vehicle: true },
          },
          hostHouse: true,
        },
      });

      // Update parking slot if assigned
      if (slotId) {
        await tx.parkingSlot.update({
          where: { id: slotId },
          data: {
            status: 'OCCUPIED',
            vehicleId: vehicle!.id,
            occupiedAt: new Date(),
          },
        });
      }

      // Update parking area occupancy (including per-type counters)
      // Only update counters when a real slot was assigned
      if (slotId) {
        const areaUpdateData: {
          currentOccupancy: { increment: number };
          currentMotor?: { increment: number };
          currentMobil?: { increment: number };
        } = { currentOccupancy: { increment: 1 } };
        if (slotType === 'MOTOR') areaUpdateData.currentMotor = { increment: 1 };
        else areaUpdateData.currentMobil = { increment: 1 };

        await tx.parkingArea.update({
          where: { id: 'guest-parking' },
          data: areaUpdateData,
        });
      }

      return guestAccess;
    });

    // Log activity
    await logActivity({
      userId: user.id,
      action: ACTIVITY_TYPES.GUEST_REGISTER.action,
      module: ACTIVITY_TYPES.GUEST_REGISTER.module,
      description: `Registrasi tamu: ${formattedPlat}`,
      details: { guestId: result.id, hostHouse: hostHouse.houseNumber },
    });

    return NextResponse.json({
      success: true,
      data: result,
    }, { status: 201 });
  } catch (error) {
    logger.error('Create guest error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
