import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser, hasRoleOrHigher } from './lib/auth';

export async function middleware(request: NextRequest) {
  const user = await getCurrentUser();
  const { pathname } = request.nextUrl;

  // Tentukan path yang hanya boleh diakses Satpam & Admin
  const isAccessMenu = pathname.startsWith('/api/access') || 
                       pathname.startsWith('/dashboard/satpam');

  if (isAccessMenu) {
    // Jika tidak login atau Role di bawah Satpam (misal: Warga), blokir!
    if (!user || !hasRoleOrHigher(user.role, 'SATPAM')) {
      return NextResponse.json(
        { error: 'Forbidden: Anda tidak memiliki akses ke menu ini' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

// Hanya jalankan middleware pada path tertentu untuk efisiensi
export const config = {
  matcher: ['/api/access/:path*', '/dashboard/satpam/:path*'],
};