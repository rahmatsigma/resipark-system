import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { updateActivity, SESSION_COOKIE_NAME_EXPORT } from '@/lib/auth';
import { verifySessionToken } from '@/lib/session';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const signedSession = cookieStore.get(SESSION_COOKIE_NAME_EXPORT)?.value;
    
    if (!signedSession) {
      return NextResponse.json({
        success: false,
        error: { code: 'NO_SESSION', message: 'Tidak ada session' }
      }, { status: 401 });
    }
    
    const token = await verifySessionToken(signedSession);
    if (!token) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_SESSION', message: 'Session tidak valid' }
      }, { status: 401 });
    }

    await updateActivity(token.sessionId);
    
    return NextResponse.json({
      success: true,
      message: 'Activity updated'
    });
  } catch (error) {
      logger.error('Update activity error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Gagal update activity' }
    }, { status: 500 });
  }
}

