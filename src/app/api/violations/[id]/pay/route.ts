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

    // Atomic transaction: create payment, mark violation PAID,
    // and remove blacklist (if any) simultaneously
    const result = await db.$transaction(async (tx) => {
      // Update violation status to PAID
      const updatedViolation = await tx.violation.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          violationId: id,
          amount: violation.totalFine,
          paymentMethod: 'CASH',
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      });

      // Remove any active blacklist for this vehicle
      const activeBlacklist = await tx.blacklist.findFirst({
        where: {
          vehicleId: violation.vehicleId,
          status: 'ACTIVE',
        },
      });

      let blacklistRemoved = false;

      if (activeBlacklist) {
        await tx.blacklist.update({
          where: { id: activeBlacklist.id },
          data: { status: 'REMOVED' },
        });
        blacklistRemoved = true;
      }

      // Reactivate vehicle if it was blacklisted
      const vehicle = await tx.vehicle.findUnique({
        where: { id: violation.vehicleId },
      });

      if (vehicle?.status === 'BLACKLISTED') {
        await tx.vehicle.update({
          where: { id: violation.vehicleId },
          data: { status: 'ACTIVE' },
        });
      }

      return { updatedViolation, payment, blacklistRemoved };
    });

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
      data: result.updatedViolation,
    });
  } catch (err) {
    console.error('Pay fine error:', err);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
