import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tidak terautentikasi' }
      }, { status: 401 });
    }

    const houses = await db.house.findMany({
      orderBy: [
        { block: 'asc' },
        { houseNumber: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: houses,
    });
  } catch (error) {
    console.error('Get houses error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
