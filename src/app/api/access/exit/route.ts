import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity';
import { calculateOvertimeFine, FINE_RULES } from '@/lib/rules';
import type { ViolationWithDetails } from '@/types';

// POST - Record vehicle exit
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'SATPAM' && user.role !== 'ADMIN')) {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Hanya satpam atau admin yang dapat mencatat akses' }
      }, { status: 403 });
    }

    const body = await request.json();
    const { platNumber } = body;

    if (!platNumber) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_PLAT', message: 'Plat nomor harus diisi' }
      }, { status: 400 });
    }

    const formattedPlat = platNumber.toUpperCase().trim();

    // Find active parking record
    const activeParking = await db.accessRecord.findFirst({
      where: {
        vehicle: { platNumber: formattedPlat },
        status: 'ACTIVE',
      },
      include: {
        vehicle: {
          include: { house: true },
        },
        area: true,
        guestAccess: {
          include: { hostHouse: true },
        },
      },
    });

    if (!activeParking) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tidak ada catatan masuk aktif untuk kendaraan ini' }
      }, { status: 404 });
    }

    const exitTime = new Date();
    const entryTime = activeParking.entryTime;
    const durationMinutes = Math.floor((exitTime.getTime() - entryTime.getTime()) / (1000 * 60));

    // Calculate fine for overtime (guests)
    let fineAmount = 0;
    let fineReason = '';

    if (activeParking.guestAccess) {
      const maxDuration = activeParking.guestAccess.maxDurationHours;
      if (durationMinutes > maxDuration * 60) {
        fineAmount = calculateOvertimeFine(entryTime, exitTime, maxDuration);
        fineReason = `Parkir melebihi batas waktu (${Math.floor(durationMinutes / 60)} jam dari maksimal ${maxDuration} jam)`;
      }
    }

    // Update access record
    await db.accessRecord.update({
      where: { id: activeParking.id },
      data: {
        exitTime,
        status: 'COMPLETED',
      },
    });

    // Release parking slot
    if (activeParking.slotNumber && activeParking.areaId) {
      const slot = await db.parkingSlot.findFirst({
        where: {
          areaId: activeParking.areaId,
          slotNumber: activeParking.slotNumber,
        },
      });

      if (slot) {
        await db.parkingSlot.update({
          where: { id: slot.id },
          data: {
            status: 'AVAILABLE',
            vehicleId: null,
            occupiedAt: null,
          },
        });
      }

      await db.parkingArea.update({
        where: { id: activeParking.areaId },
        data: { currentOccupancy: { decrement: 1 } },
      });
    }

    // Create violation if there's a fine
    let violation: ViolationWithDetails | null = null;
    if (fineAmount > 0) {
      const createdViolation = await db.violation.create({
        data: {
          vehicleId: activeParking.vehicleId,
          violationTypeId: 'OVER_TIME',
          description: fineReason,
          baseFine: fineAmount,
          totalFine: fineAmount,
          multiplier: 1,
          status: 'PENDING',
          recordedBy: user.id,
          violationDate: exitTime,
        },
      });
      violation = {
        id: createdViolation.id,
        vehicle: null,
        violationType: null,
        description: createdViolation.description,
        baseFine: createdViolation.baseFine,
        totalFine: createdViolation.totalFine,
        multiplier: createdViolation.multiplier,
        status: createdViolation.status,
        violationDate: createdViolation.violationDate,
        paidAt: createdViolation.paidAt,
        createdAt: createdViolation.createdAt,
      } as ViolationWithDetails;
    }

    // Log activity
    await logActivity({
      userId: user.id,
      action: ACTIVITY_TYPES.ACCESS_EXIT.action,
      module: ACTIVITY_TYPES.ACCESS_EXIT.module,
      description: `Kendaraan keluar: ${formattedPlat}`,
      details: { 
        accessId: activeParking.id, 
        vehicleId: activeParking.vehicleId,
        duration: durationMinutes,
        fine: fineAmount,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        accessId: activeParking.id,
        platNumber: formattedPlat,
        vehicle: {
          platNumber: activeParking.vehicle.platNumber,
          brand: activeParking.vehicle.brand,
          color: activeParking.vehicle.color,
          category: activeParking.vehicle.category,
        },
        entryTime,
        exitTime,
        duration: durationMinutes,
        fine: fineAmount > 0 ? {
          amount: fineAmount,
          reason: fineReason,
          violationId: violation?.id,
        } : null,
      },
    });
  } catch (error) {
    console.error('Access exit error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
