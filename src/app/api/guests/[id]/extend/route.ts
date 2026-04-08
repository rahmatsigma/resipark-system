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
    
    if (!user || (user.role !== 'SATPAM' && user.role !== 'ADMIN')) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tidak memiliki akses' }
      }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { hours } = body;

    if (!hours || hours < 1) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_HOURS', message: 'Durasi perpanjangan tidak valid' }
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

    // Calculate new expiry time
    const currentExpiry = guestAccess.expiredAt || new Date();
    const now = new Date();
    const baseTime = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseTime.getTime() + hours * 60 * 60 * 1000);

    // Update guest access
    const updated = await db.guestAccess.update({
      where: { id },
      data: {
        expiredAt: newExpiry,
        maxDurationHours: guestAccess.maxDurationHours + hours,
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      action: ACTIVITY_TYPES.GUEST_EXTEND.action,
      module: ACTIVITY_TYPES.GUEST_EXTEND.module,
      description: `Perpanjang waktu tamu +${hours} jam`,
      details: { guestId: id, hoursAdded: hours },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Extend guest error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
