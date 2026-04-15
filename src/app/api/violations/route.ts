import { NextRequest} from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity';
import { calculateFine, checkAutoBlacklist } from '@/lib/rules';
import type { BlacklistWithVehicle, ViolationWithDetails } from @/types;
import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/auth';

export async function POST(request: Request) {
  // 1. Ambil session user saat ini
  const user = await getCurrentUser();

  // 2. Validasi RBAC: Hanya SATPAM dan ADMIN yang boleh
  if (!user || !hasPermission(user.role, ['SATPAM', 'ADMIN'])) {
    return NextResponse.json(
      { 
        success: false, 
        error: {
          code: 'FORBIDDEN',
          message: 'Akses Ditolak: Hanya Satpam dan Admin yang dapat mencatat pelanggaran'
        }
      },
      { status: 403 }
    );
  }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const vehicleId = searchParams.get('vehicleId') || '';

    const where: any = {};

    // For WARGA, only show their vehicles' violations
    if (user.role === 'WARGA' && user.houseId) {
      where.vehicle = { houseId: user.houseId };
    }

    if (status) {
      where.status = status;
    }

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    const total = await db.violation.count({ where });
    const totalPages = Math.ceil(total / limit);

    const violations = await db.violation.findMany({
      where,
      include: {
        vehicle: {
          select: {
            platNumber: true,
            brand: true,
            color: true,
          },
        },
        violationType: {
          select: {
            code: true,
            name: true,
            baseFine: true,
          },
        },
        recorder: {
          select: { fullName: true },
        },
      },
      orderBy: { violationDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: violations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Get violations error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }

// POST - Create violation
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'SATPAM' && user.role !== 'ADMIN')) {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Tidak memiliki akses' }
      }, { status: 403 });
    }

    const body = await request.json();
    const { platNumber, violationTypeCode, description, customAmount } = body;

    if (!platNumber || !violationTypeCode) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Plat nomor dan jenis pelanggaran harus diisi' }
      }, { status: 400 });
    }

    // Find vehicle
    const vehicle = await db.vehicle.findUnique({
      where: { platNumber: platNumber.toUpperCase().trim() },
    });

    if (!vehicle) {
      return NextResponse.json({
        success: false,
        error: { code: 'VEHICLE_NOT_FOUND', message: 'Kendaraan tidak ditemukan' }
      }, { status: 404 });
    }

    // Find violation type
    const violationType = await db.violationType.findUnique({
      where: { code: violationTypeCode },
    });

    if (!violationType) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_VIOLATION_TYPE', message: 'Jenis pelanggaran tidak valid' }
      }, { status: 400 });
    }

    // Calculate fine with multiplier
    const { baseFine, multiplier, totalFine } = await calculateFine(
      vehicle.id,
      violationTypeCode as any,
      customAmount
    );

    // Create violation
    const violation = await db.violation.create({
      data: {
        vehicleId: vehicle.id,
        violationTypeId: violationType.id,
        description,
        baseFine,
        totalFine,
        multiplier,
        status: 'PENDING',
        recordedBy: user.id,
        violationDate: new Date(),
      },
      include: {
        vehicle: true,
        violationType: true,
      },
    });

    // Check auto-blacklist conditions
    const blacklistCheck = await checkAutoBlacklist(vehicle.id);
    
    let autoBlacklist: BlacklistWithVehicle | null = null;
    if (blacklistCheck.shouldBlacklist) {
      const endDate = blacklistCheck.duration
        ? new Date(Date.now() + blacklistCheck.duration * 24 * 60 * 60 * 1000)
        : null;

      const createdBlacklist = await db.blacklist.create({
        data: {
          vehicleId: vehicle.id,
          reason: blacklistCheck.reason,
          blacklistType: blacklistCheck.blacklistType as any,
          startDate: new Date(),
          endDate,
          addedBy: user.id,
          status: 'ACTIVE',
        },
      });
      autoBlacklist = {
        id: createdBlacklist.id,
        vehicle: null,
        reason: createdBlacklist.reason,
        blacklistType: createdBlacklist.blacklistType,
        startDate: createdBlacklist.startDate,
        endDate: createdBlacklist.endDate,
        status: createdBlacklist.status,
        createdAt: createdBlacklist.createdAt,
        updatedAt: createdBlacklist.updatedAt,
      } as BlacklistWithVehicle;

      // Update vehicle status
      await db.vehicle.update({
        where: { id: vehicle.id },
        data: { status: 'BLACKLISTED' },
      });
    }

    // Log activity
    await logActivity({
      userId: user.id,
      action: ACTIVITY_TYPES.VIOLATION_CREATE.action,
      module: ACTIVITY_TYPES.VIOLATION_CREATE.module,
      description: `Mencatat pelanggaran: ${vehicle.platNumber} - ${violationType.name}`,
      details: { 
        violationId: violation.id, 
        totalFine,
        autoBlacklisted: blacklistCheck.shouldBlacklist,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        violation: {
          id: violation.id,
          platNumber: violation.vehicle.platNumber,
          violationType: violation.violationType.name,
          totalFine: violation.totalFine,
          multiplier: violation.multiplier,
        },
        autoBlacklist: autoBlacklist ? {
          triggered: true,
          reason: autoBlacklist.reason,
        } : null,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create violation error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
