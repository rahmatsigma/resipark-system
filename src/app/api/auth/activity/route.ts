import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { updateActivity } from '@/lib/auth';
import { SESSION_COOKIE_NAME_EXPORT } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME_EXPORT)?.value;
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: { code: 'NO_SESSION', message: 'Tidak ada session' }
      }, { status: 401 });
    }
    
    await updateActivity(sessionId);
    
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

