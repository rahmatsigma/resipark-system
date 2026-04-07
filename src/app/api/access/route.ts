import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

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

    const where: any = {};

    // For WARGA, only show their vehicles' access
    if (user.role === 'WARGA' && user.houseId) {
      where.vehicle = { houseId: user.houseId };
    }

    if (search) {
      where.vehicle = { ...where.vehicle, platNumber: { contains: search.toUpperCase() } };
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
    console.error('Get access records error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
