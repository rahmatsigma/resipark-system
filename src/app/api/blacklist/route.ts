import { NextRequest, } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity';
import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/auth';

// Untuk fungsi Tambah Blacklist Manual
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    // Validasi RBAC: STRICLY ADMIN ONLY
    if (!user || !hasPermission(user.role, ['ADMIN'])) {
      return NextResponse.json(
        { 
          success: false, 
          error: {
            code: 'FORBIDDEN',
            message: 'Akses Ditolak: Hanya Admin yang memiliki wewenang mengelola Blacklist'
          }
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const where: any = {};

    if (status) {
      where.status = status;
    } else {
      // By default, show active blacklists
      where.status = 'ACTIVE';
    }

    if (search) {
      where.vehicle = {
        platNumber: { contains: search.toUpperCase() },
      };
    }

    const total = await db.blacklist.count({ where });
    const totalPages = Math.ceil(total / limit);

    const blacklists = await db.blacklist.findMany({
      where,
      include: {
        vehicle: {
          select: {
            platNumber: true,
            brand: true,
            color: true,
            vehicleType: true,
          },
        },
        creator: {
          select: { fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: blacklists,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Get blacklist error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}

// POST - Add to blacklist
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Hanya admin yang dapat mengelola blacklist' }
      }, { status: 403 });
    }

    const body = await request.json();
    const { platNumber, reason, blacklistType, durationDays } = body;

    if (!platNumber || !reason) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Plat nomor dan alasan harus diisi' }
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

    // Check if already blacklisted
    const existingBlacklist = await db.blacklist.findFirst({
      where: {
        vehicleId: vehicle.id,
        status: 'ACTIVE',
      },
    });

    if (existingBlacklist) {
      return NextResponse.json({
        success: false,
        error: { code: 'ALREADY_BLACKLISTED', message: 'Kendaraan sudah ada di daftar blacklist' }
      }, { status: 400 });
    }

    // Calculate end date if temporary
    const endDate = durationDays
      ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
      : null;

    // Create blacklist
    const blacklist = await db.blacklist.create({
      data: {
        vehicleId: vehicle.id,
        reason,
        blacklistType: blacklistType || 'TEMPORARY',
        startDate: new Date(),
        endDate,
        addedBy: user.id,
        status: 'ACTIVE',
      },
      include: {
        vehicle: true,
      },
    });

    // Update vehicle status
    await db.vehicle.update({
      where: { id: vehicle.id },
      data: { status: 'BLACKLISTED' },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      action: ACTIVITY_TYPES.BLACKLIST_ADD.action,
      module: ACTIVITY_TYPES.BLACKLIST_ADD.module,
      description: `Menambahkan ${vehicle.platNumber} ke blacklist: ${reason}`,
      details: { 
        blacklistId: blacklist.id, 
        vehicleId: vehicle.id,
        reason,
        durationDays,
      },
    });

    return NextResponse.json({
      success: true,
      data: blacklist,
    }, { status: 201 });
  } catch (error) {
    console.error('Add blacklist error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}

// DELETE - Remove from blacklist
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Hanya admin yang dapat mengelola blacklist' }
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_ID', message: 'ID blacklist harus diisi' }
      }, { status: 400 });
    }

    const blacklist = await db.blacklist.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!blacklist) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Blacklist tidak ditemukan' }
      }, { status: 404 });
    }

    // Update blacklist status
    await db.blacklist.update({
      where: { id },
      data: { status: 'REMOVED' },
    });

    // Check if there are other active blacklists for this vehicle
    const otherBlacklists = await db.blacklist.count({
      where: {
        vehicleId: blacklist.vehicleId,
        status: 'ACTIVE',
      },
    });

    // If no other active blacklists, update vehicle status
    if (otherBlacklists === 0) {
      await db.vehicle.update({
        where: { id: blacklist.vehicleId },
        data: { status: 'ACTIVE' },
      });
    }

    // Log activity
    await logActivity({
      userId: user.id,
      action: ACTIVITY_TYPES.BLACKLIST_REMOVE.action,
      module: ACTIVITY_TYPES.BLACKLIST_REMOVE.module,
      description: `Menghapus ${blacklist.vehicle.platNumber} dari blacklist`,
      details: { 
        blacklistId: id, 
        vehicleId: blacklist.vehicleId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Kendaraan berhasil dihapus dari blacklist',
    });
  } catch (error) {
    console.error('Remove blacklist error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
