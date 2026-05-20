import { NextResponse } from 'next/server';
import { logout } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    await logout();
    
    return NextResponse.json({
      success: true,
      message: 'Logout berhasil'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan sistem',
      }
    }, { status: 500 });
  }
}
