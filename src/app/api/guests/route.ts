import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity';
import { isVehicleBlacklisted, checkParkingCapacity, getAvailableSlot } from '@/lib/rules';

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

    const guests = await db.guestAccess.findMany({
      include: {
        accessRecord: {
          include: {
            vehicle: true,
          },
        },
        hostHouse: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: guests,
    });
  } catch (error) {
    console.error('Get guests error:', error);
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
    const { platNumber, brand, color, hostHouseNumber, purpose, maxDurationHours } = body;

    if (!platNumber || !hostHouseNumber || !purpose) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Data tidak lengkap' }
      }, { status: 400 });
    }

    const formattedPlat = platNumber.toUpperCase().trim();

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
          vehicleType: 'MOTOR',
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

    // Check parking capacity
    const capacity = await checkParkingCapacity('guest-parking');
    if (!capacity.available) {
      return NextResponse.json({
        success: false,
        error: { code: 'PARKING_FULL', message: 'Area parkir tamu penuh' }
      }, { status: 503 });
    }

    // Get available slot
    const slotId = await getAvailableSlot('guest-parking');
    let slotNumber = null;

    if (slotId) {
      const slot = await db.parkingSlot.findUnique({ where: { id: slotId } });
      slotNumber = slot?.slotNumber;
    }

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
          maxDurationHours: maxDurationHours || 8,
          expiredAt: new Date(Date.now() + (maxDurationHours || 8) * 60 * 60 * 1000),
        },
        include: {
          accessRecord: {
            include: { vehicle: true },
          },
          hostHouse: true,
        },
      });

      // Update parking slot
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

      // Update parking area occupancy
      await tx.parkingArea.update({
        where: { id: 'guest-parking' },
        data: { currentOccupancy: { increment: 1 } },
      });

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
    console.error('Create guest error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
