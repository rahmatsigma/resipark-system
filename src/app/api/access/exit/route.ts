import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity';
import { logger } from '@/lib/logger';
import { calculateOvertimeFine } from '@/lib/rules';
import { getOrCreateViolationType } from '@/lib/violation-types';

const OVERTIME_VIOLATION_CODE = 'OVER_TIME';

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

    const guestAccess = activeParking.guestAccess;
    const maxDurationHours = guestAccess?.maxDurationHours ?? null;
    let fineAmount = 0;
    let fineReason = '';
    let violationId: string | null = null;

    if (guestAccess && maxDurationHours !== null) {
      const overtimeMinutes = durationMinutes - maxDurationHours * 60;
      if (overtimeMinutes > 0) {
        fineAmount = calculateOvertimeFine(entryTime, exitTime, maxDurationHours);
        fineReason = `Parkir melebihi batas waktu (${Math.ceil(durationMinutes / 60)} jam dari maksimal ${maxDurationHours} jam)`;

        const overtimeViolationType = await getOrCreateViolationType(OVERTIME_VIOLATION_CODE);

        if (!overtimeViolationType) {
          return NextResponse.json({
            success: false,
            error: { code: 'VIOLATION_TYPE_NOT_FOUND', message: 'Jenis pelanggaran denda tidak ditemukan' }
          }, { status: 500 });
        }

        const existingViolation = await db.violation.findFirst({
          where: {
            vehicleId: activeParking.vehicleId,
            violationTypeId: overtimeViolationType.id,
            violationDate: { gte: entryTime },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (existingViolation?.status === 'PENDING') {
          const shouldSyncPendingFine =
            existingViolation.totalFine !== fineAmount ||
            (existingViolation.description || '') !== fineReason;

          const syncedViolation = shouldSyncPendingFine
            ? await db.violation.update({
                where: { id: existingViolation.id },
                data: {
                  description: fineReason,
                  baseFine: fineAmount,
                  totalFine: fineAmount,
                  multiplier: 1,
                },
              })
            : existingViolation;

          return NextResponse.json({
            success: false,
            error: {
              code: 'PAYMENT_REQUIRED',
              message: 'Akses keluar ditahan sampai denda keterlambatan dibayar',
              details: {
                violationId: syncedViolation.id,
                amount: syncedViolation.totalFine,
                reason: syncedViolation.description || fineReason,
              },
            },
          }, { status: 402 });
        }

        if (!existingViolation) {
          const createdViolation = await db.violation.create({
            data: {
              vehicleId: activeParking.vehicleId,
              violationTypeId: overtimeViolationType.id,
              description: fineReason,
              baseFine: fineAmount,
              totalFine: fineAmount,
              multiplier: 1,
              status: 'PENDING',
              recordedBy: user.id,
              violationDate: exitTime,
            },
          });

          violationId = createdViolation.id;

          return NextResponse.json({
            success: false,
            error: {
              code: 'PAYMENT_REQUIRED',
              message: 'Akses keluar ditahan sampai denda keterlambatan dibayar',
              details: {
                violationId: createdViolation.id,
                amount: createdViolation.totalFine,
                reason: createdViolation.description || fineReason,
              },
            },
          }, { status: 402 });
        }

        violationId = existingViolation.id;

        if (existingViolation.status === 'PAID') {
          fineAmount = existingViolation.totalFine;
          fineReason = existingViolation.description || fineReason;
        }
      }
    }

    await db.$transaction(async (tx) => {
      await tx.accessRecord.update({
        where: { id: activeParking.id },
        data: {
          exitTime,
          status: 'COMPLETED',
        },
      });

      if (activeParking.slotNumber && activeParking.areaId) {
        const slot = await tx.parkingSlot.findFirst({
          where: {
            areaId: activeParking.areaId,
            slotNumber: activeParking.slotNumber,
          },
        });

        if (slot) {
          await tx.parkingSlot.update({
            where: { id: slot.id },
            data: {
              status: 'AVAILABLE',
              vehicleId: null,
              occupiedAt: null,
            },
          });

          // Decrement appropriate counters on the area based on slot type
          const areaUpdate: {
            currentOccupancy: { decrement: number };
            currentMotor?: { decrement: number };
            currentMobil?: { decrement: number };
          } = { currentOccupancy: { decrement: 1 } };
          if (slot.slotType === 'MOTOR') {
            areaUpdate.currentMotor = { decrement: 1 };
          } else {
            areaUpdate.currentMobil = { decrement: 1 };
          }

          await tx.parkingArea.update({
            where: { id: activeParking.areaId },
            data: areaUpdate,
          });

          // Keep guest plate number unchanged after exit so future visits can reuse the same record.
          if (activeParking.vehicle && activeParking.vehicle.category === 'TAMU') {
            await tx.vehicle.update({
              where: { id: activeParking.vehicleId },
              data: {
                status: 'ACTIVE',
                houseId: null,
                userId: null,
              },
            });
          }
        }
      }
    });

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
        violationId,
        blocked: false,
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
          violationId,
        } : null,
      },
    });
  } catch (error) {
    logger.error('Access exit error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
