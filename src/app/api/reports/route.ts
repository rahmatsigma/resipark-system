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
    const type = searchParams.get('type') || 'access';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_DATE', message: 'Rentang tanggal harus diisi' }
      }, { status: 400 });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    let data: any[] = [];
    let summary = { total: 0, amount: 0 };
    let title = '';
    let period = `${from} s/d ${to}`;

    switch (type) {
      case 'access':
        title = 'Laporan Akses Kendaraan';
        const accessRecords = await db.accessRecord.findMany({
          where: {
            entryTime: {
              gte: fromDate,
              lte: toDate,
            },
          },
          include: {
            vehicle: true,
          },
          orderBy: { entryTime: 'desc' },
        });

        data = accessRecords.map(record => ({
          entryTime: record.entryTime,
          platNumber: record.vehicle.platNumber,
          category: record.vehicle.category,
          duration: record.exitTime
            ? Math.floor((new Date(record.exitTime).getTime() - new Date(record.entryTime).getTime()) / 60000)
            : null,
        }));

        summary = {
          total: accessRecords.length,
          amount: 0,
        };
        break;

      case 'violations':
        title = 'Laporan Pelanggaran';
        const violations = await db.violation.findMany({
          where: {
            violationDate: {
              gte: fromDate,
              lte: toDate,
            },
          },
          include: {
            vehicle: true,
            violationType: true,
          },
          orderBy: { violationDate: 'desc' },
        });

        data = violations.map(v => ({
          violationDate: v.violationDate,
          platNumber: v.vehicle.platNumber,
          violationType: v.violationType.name,
          totalFine: v.totalFine,
          status: v.status,
        }));

        summary = {
          total: violations.length,
          amount: violations.reduce((sum, v) => sum + v.totalFine, 0),
        };
        break;

      case 'revenue':
        title = 'Laporan Pendapatan';
        const payments = await db.payment.findMany({
          where: {
            paidAt: {
              gte: fromDate,
              lte: toDate,
            },
            status: 'COMPLETED',
          },
          include: {
            violation: {
              include: { vehicle: true },
            },
          },
          orderBy: { paidAt: 'desc' },
        });

        data = payments.map(p => ({
          date: p.paidAt,
          source: `Denda - ${p.violation?.vehicle?.platNumber || 'Unknown'}`,
          amount: p.amount,
        }));

        summary = {
          total: payments.length,
          amount: payments.reduce((sum, p) => sum + p.amount, 0),
        };
        break;

      case 'blacklist':
        title = 'Laporan Blacklist';
        const blacklists = await db.blacklist.findMany({
          where: {
            createdAt: {
              gte: fromDate,
              lte: toDate,
            },
          },
          include: {
            vehicle: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        data = blacklists.map(b => ({
          platNumber: b.vehicle.platNumber,
          reason: b.reason,
          blacklistType: b.blacklistType,
          status: b.status,
        }));

        summary = {
          total: blacklists.length,
          amount: 0,
        };
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        type,
        title,
        period,
        generatedAt: new Date().toISOString(),
        data,
        summary,
      },
    });
  } catch (error) {
    console.error('Generate report error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
