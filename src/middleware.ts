import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from './lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedSession = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const token = signedSession ? await verifySessionToken(signedSession) : null;

  // 1. Tentukan path yang hanya boleh diakses Satpam & Admin
  const isAccessMenu = pathname.startsWith('/api/access') || 
                       pathname.startsWith('/dashboard/satpam');

  if (isAccessMenu) {
    // Jika tidak login atau Role di bawah Satpam (misal: Warga), blokir!
    if (!token || (token.role !== 'SATPAM' && token.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Forbidden: Anda tidak memiliki akses ke menu ini' },
        { status: 403 }
      );
    }
  }

  // 2. Proteksi ketat untuk API Logs (Hanya ADMIN)
  const isLogsApi = pathname.startsWith('/api/logs');
  
  if (isLogsApi) {
    // Jika tidak login atau Role BUKAN ADMIN (Warga & Satpam), blokir!
    if (!token || token.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Forbidden: Hanya Admin yang dapat mengakses log sistem' },
          { status: 403 }
        );
    }
  }

  return NextResponse.next();
}

// Hanya jalankan middleware pada path tertentu untuk efisiensi
export const config = {
  matcher: [
    '/api/access/:path*', 
    '/dashboard/satpam/:path*', 
    '/api/logs/:path*' // Tambahkan path logs ke matcher agar middleware ini tereksekusi
  ],
};