import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { nanoid } from 'nanoid';

// Simple in-memory token store (use Redis in production)
const resetTokens = new Map<string, { email: string; expiresAt: Date }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_EMAIL',
          message: 'Email harus diisi',
        }
      }, { status: 400 });
    }

    // Cek user dengan email tersebut
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Jangan beritahu bahwa email tidak ada (security)
      return NextResponse.json({
        success: true,
        message: 'Jika email terdaftar, link reset password akan dikirim',
      });
    }

    // Generate reset token
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 jam

    resetTokens.set(token, { email, expiresAt });

    // Dalam production, kirim email
    // Untuk demo, kita return token
    console.log(`Reset token for ${email}: ${token}`);

    return NextResponse.json({
      success: true,
      message: 'Link reset password telah dikirim ke email Anda',
      // Untuk demo saja - hapus di production
      demoToken: token,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan sistem',
      }
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Token dan password baru harus diisi',
        }
      }, { status: 400 });
    }

    // Cek token
    const tokenData = resetTokens.get(token);

    if (!tokenData) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token tidak valid atau sudah kadaluarsa',
        }
      }, { status: 400 });
    }

    if (tokenData.expiresAt < new Date()) {
      resetTokens.delete(token);
      return NextResponse.json({
        success: false,
        error: {
          code: 'EXPIRED_TOKEN',
          message: 'Token sudah kadaluarsa',
        }
      }, { status: 400 });
    }

    // Hash password baru
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await db.user.update({
      where: { email: tokenData.email },
      data: { password: hashedPassword },
    });

    // Hapus token
    resetTokens.delete(token);

    return NextResponse.json({
      success: true,
      message: 'Password berhasil direset. Silakan login.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan sistem',
      }
    }, { status: 500 });
  }
}
