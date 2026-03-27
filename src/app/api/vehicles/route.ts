import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity';
import { checkVehicleQuota, validatePlatNumber } from '@/lib/rules';

// GET - List vehicles
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tidak terautentikasi' }
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';

    const where: any = {};

    // For WARGA role, only show their own vehicles (by userId)
    if (user.role === 'WARGA') {
      where.userId = user.id;
    }
    // ADMIN sees all vehicles

    if (search) {
      where.OR = [
        { platNumber: { contains: search.toUpperCase() } },
        { brand: { contains: search } },
      ];
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    const total = await db.vehicle.count({ where });
    const totalPages = Math.ceil(total / limit);

    const vehicles = await db.vehicle.findMany({
      where,
      include: {
        house: {
          select: {
            id: true,
            houseNumber: true,
            block: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        blacklist: {
          where: { status: 'ACTIVE' },
          select: { id: true, reason: true },
        },
      },
      orderBy: { registeredAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: vehicles,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Get vehicles error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}

// POST - Create vehicle
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tidak terautentikasi' }
      }, { status: 401 });
    }

    const body = await request.json();
    const { platNumber, vehicleType, brand, color, category, houseId } = body;

    // Validate plat number format
    const platValidation = validatePlatNumber(platNumber);
    if (!platValidation.valid) {
      return NextResponse.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: platValidation.error }
      }, { status: 400 });
    }

    const formattedPlat = platNumber.toUpperCase().trim();

    // Check if plat number already exists
    const existingVehicle = await db.vehicle.findUnique({
      where: { platNumber: formattedPlat },
    });

    if (existingVehicle) {
      return NextResponse.json({
        success: false,
        error: { code: 'DUPLICATE_PLAT', message: 'Plat nomor sudah terdaftar' }
      }, { status: 409 });
    }

    // Determine houseId for WARGA
    let targetHouseId = houseId;
    if (user.role === 'WARGA') {
      targetHouseId = user.houseId || null;
    }

    // For WARGA, check quota by userId
    if (user.role === 'WARGA' && category === 'WARGA') {
      const userVehicleCount = await db.vehicle.count({
        where: {
          userId: user.id,
          status: 'ACTIVE',
        },
      });
      const maxVehicles = 2;
      if (userVehicleCount >= maxVehicles) {
        return NextResponse.json({
          success: false,
          error: { 
            code: 'QUOTA_EXCEEDED', 
            message: `Kuota kendaraan sudah penuh (${userVehicleCount}/${maxVehicles})` 
          }
        }, { status: 403 });
      }
    }

    // For Admin adding to a house, check house quota  
    if (user.role === 'ADMIN' && targetHouseId && category === 'WARGA') {
      const quota = await checkVehicleQuota(targetHouseId);
      if (!quota.available) {
        return NextResponse.json({
          success: false,
          error: { 
            code: 'QUOTA_EXCEEDED', 
            message: `Kuota kendaraan rumah ini sudah penuh (${quota.current}/${quota.max})` 
          }
        }, { status: 403 });
      }
    }

    // For non-WARGA categories (TAMU, SERVICE, DELIVERY), don't require userId
    const vehicleUserId = user.role === 'WARGA' ? user.id : (body.userId || null);
    
    const vehicle = await db.vehicle.create({
      data: {
        platNumber: formattedPlat,
        vehicleType: vehicleType || 'MOTOR',
        brand,
        color,
        category: category || 'WARGA',
        status: 'ACTIVE',
        houseId: targetHouseId,
        userId: vehicleUserId,
      },
      include: {
        house: true,
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      action: ACTIVITY_TYPES.VEHICLE_CREATE.action,
      module: ACTIVITY_TYPES.VEHICLE_CREATE.module,
      description: `Mendaftarkan kendaraan ${formattedPlat}`,
      details: { vehicleId: vehicle.id, platNumber: formattedPlat },
    });

    return NextResponse.json({
      success: true,
      data: vehicle,
    }, { status: 201 });
  } catch (error) {
    console.error('Create vehicle error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
