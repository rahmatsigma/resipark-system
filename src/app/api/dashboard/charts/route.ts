import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'PENGELOLA')) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tidak memiliki akses' }
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';

    let days = 7;
    if (period === '30d') days = 30;
    if (period === '90d') days = 90;

    const chartData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const entries = await db.accessRecord.count({
        where: {
          entryTime: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      const exits = await db.accessRecord.count({
        where: {
          exitTime: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      chartData.push({
        date: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        entries,
        exits,
      });
    }

    return NextResponse.json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error('Get chart data error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
