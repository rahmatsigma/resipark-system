import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity';
import { logger } from '@/lib/logger';

const HOUR_IN_MS = 60 * 60 * 1000;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'SATPAM' && user.role !== 'ADMIN')) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tidak memiliki akses' }
      }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { maxDurationHours } = body;
    const parsedHours = Number(maxDurationHours);

    if (!Number.isInteger(parsedHours)) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_HOURS', message: 'Durasi harus berupa angka bulat (boleh minus untuk testing denda)' }
      }, { status: 400 });
    }

    // Find guest access
    const guestAccess = await db.guestAccess.findUnique({
      where: { id },
      include: {
        accessRecord: true,
      },
    });

    if (!guestAccess) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Data tamu tidak ditemukan' }
      }, { status: 404 });
    }

    if (guestAccess.accessRecord.status !== 'ACTIVE') {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_ACTIVE', message: 'Akses tamu sudah tidak aktif' }
      }, { status: 400 });
    }

    const effectiveDurationHours = parsedHours;

    // Calculate new expiry time relative to original entryTime
    const entryTime = guestAccess.accessRecord.entryTime;
    const newExpiry = new Date(entryTime.getTime() + effectiveDurationHours * HOUR_IN_MS);

    // Update guest access
    const updated = await db.guestAccess.update({
      where: { id },
      data: {
        expiredAt: newExpiry,
        maxDurationHours: effectiveDurationHours,
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      action: ACTIVITY_TYPES.GUEST_EXTEND.action,
      module: ACTIVITY_TYPES.GUEST_EXTEND.module,
      description: parsedHours < 0
        ? `Set durasi tamu menjadi ${effectiveDurationHours} jam untuk simulasi overtime`
        : `Set durasi tamu menjadi ${effectiveDurationHours} jam (absolute)`,
      details: {
        guestId: id,
        maxDurationHours: effectiveDurationHours,
        testOvertime: parsedHours < 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('Extend guest error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
