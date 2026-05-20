import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

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
    const status = searchParams.get('status') || '';


    const where: Record<string, unknown> = {};
    const vehicleWhere: Record<string, unknown> = {};

    // For WARGA, only show their own vehicles' access
    if (user.role === 'WARGA' && user.houseId) {
      vehicleWhere.houseId = user.houseId;
    }

    if (search) {
      vehicleWhere.platNumber = { contains: search.toUpperCase() };
    }

    if (Object.keys(vehicleWhere).length > 0) {
      where.vehicle = vehicleWhere;
    }

    if (status) {
      where.status = status;
    }

    const total = await db.accessRecord.count({ where });
    const totalPages = Math.ceil(total / limit);

    const records = await db.accessRecord.findMany({
      where,
      include: {
        vehicle: {
          include: {
            house: true,
          },
        },
        area: true,
        operator: {
          select: { fullName: true },
        },
        guestAccess: {
          include: {
            hostHouse: true,
          },
        },
      },
      orderBy: { entryTime: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    logger.error('Get access records error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
