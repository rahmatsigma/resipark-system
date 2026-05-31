import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

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

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    endDate.setDate(endDate.getDate() + 1);

    const lastDate = new Date(endDate);
    lastDate.setDate(lastDate.getDate() - 1);

    type ChartDataPoint = {
      date: string;
      entries: number;
      exits: number;
    };

    const chartRows = await db.$queryRaw<Array<{ day: Date; entries: bigint | number; exits: bigint | number }>>`
      WITH days AS (
        SELECT generate_series(${startDate}::date, ${lastDate}::date, interval '1 day')::date AS day
      ),
      entries AS (
        SELECT date_trunc('day', "entryTime")::date AS day, COUNT(*)::bigint AS entries
        FROM "access_records"
        WHERE "entryTime" >= ${startDate} AND "entryTime" < ${endDate}
        GROUP BY 1
      ),
      exits AS (
        SELECT date_trunc('day', "exitTime")::date AS day, COUNT(*)::bigint AS exits
        FROM "access_records"
        WHERE "exitTime" >= ${startDate} AND "exitTime" < ${endDate}
        GROUP BY 1
      )
      SELECT
        days.day,
        COALESCE(entries.entries, 0)::bigint AS entries,
        COALESCE(exits.exits, 0)::bigint AS exits
      FROM days
      LEFT JOIN entries ON entries.day = days.day
      LEFT JOIN exits ON exits.day = days.day
      ORDER BY days.day
    `;

    const chartData: ChartDataPoint[] = chartRows.map((row) => ({
      date: row.day.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      entries: Number(row.entries),
      exits: Number(row.exits),
    }));

    return NextResponse.json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    logger.error('Get chart data error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
