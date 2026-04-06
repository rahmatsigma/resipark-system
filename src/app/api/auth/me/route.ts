import { NextResponse } from 'next/server';
import { getCurrentUser, updateActivity, SESSION_COOKIE_NAME_EXPORT } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME_EXPORT)?.value;
    
    if (sessionId) {
      updateActivity(sessionId);
    }
    
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Tidak terautentikasi',
        }
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan sistem',
      }
    }, { status: 500 });
  }
}
