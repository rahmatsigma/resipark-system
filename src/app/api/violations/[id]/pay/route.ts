import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tidak memiliki akses' }
      }, { status: 401 });
    }

    const { id } = await params;

    const violation = await db.violation.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!violation) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pelanggaran tidak ditemukan' }
      }, { status: 404 });
    }

    if (violation.status !== 'PENDING') {
      return NextResponse.json({
        success: false,
        error: { code: 'ALREADY_PAID', message: 'Denda sudah dibayar atau dibebaskan' }
      }, { status: 400 });
    }

    // Update violation status
    const updated = await db.violation.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    // Create payment record
    await db.payment.create({
      data: {
        violationId: id,
        amount: violation.totalFine,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        paidAt: new Date(),
      },
    });

    // Check if vehicle should be removed from blacklist
    const activeBlacklist = await db.blacklist.findFirst({
      where: {
        vehicleId: violation.vehicleId,
        status: 'ACTIVE',
        blacklistType: 'AUTO_DENDA',
      },
    });

    if (activeBlacklist) {
      // Check if all fines are paid
      const pendingFines = await db.violation.count({
        where: {
          vehicleId: violation.vehicleId,
          status: 'PENDING',
        },
      });

      if (pendingFines === 0) {
        await db.blacklist.update({
          where: { id: activeBlacklist.id },
          data: { status: 'REMOVED' },
        });

        await db.vehicle.update({
          where: { id: violation.vehicleId },
          data: { status: 'ACTIVE' },
        });
      }
    }

    // Log activity
    await logActivity({
      userId: user.id,
      action: ACTIVITY_TYPES.VIOLATION_PAY.action,
      module: ACTIVITY_TYPES.VIOLATION_PAY.module,
      description: `Pembayaran denda: ${violation.vehicle.platNumber}`,
      details: { violationId: id, amount: violation.totalFine },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Pay fine error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
