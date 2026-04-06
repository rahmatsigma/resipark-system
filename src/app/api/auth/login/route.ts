import { NextRequest, NextResponse } from 'next/server';
import { login, updateActivity, SESSION_COOKIE_NAME_EXPORT } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Username dan password harus diisi',
        }
      }, { status: 400 });
    }

    const result = await login(username, password);
    
    if (result.success) {
      const cookieStore = await cookies();
      const sessionId = cookieStore.get(SESSION_COOKIE_NAME_EXPORT)?.value;
      if (sessionId) {
        updateActivity(sessionId);
      }
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: result.error || 'Username atau password salah',
        }
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan sistem',
      }
    }, { status: 500 });
  }
}
