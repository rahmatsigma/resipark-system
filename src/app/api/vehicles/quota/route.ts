import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tidak terautentikasi' }
      }, { status: 401 });
    }

    // Count vehicles by userId for WARGA
    const count = await db.vehicle.count({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
    });

    const maxVehicles = 2;

    return NextResponse.json({
      success: true,
      data: {
        current: count,
        max: maxVehicles,
        available: count < maxVehicles,
      },
    });
  } catch (error) {
    logger.error('Get quota error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
