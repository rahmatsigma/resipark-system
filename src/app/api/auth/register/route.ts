import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phone, username, password, houseNumber } = body;

    // Validasi input
    if (!fullName || !email || !username || !password) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Semua field wajib harus diisi',
        }
      }, { status: 400 });
    }

    // Cek username sudah ada
    const existingUsername = await db.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'USERNAME_EXISTS',
          message: 'Username sudah digunakan',
        }
      }, { status: 409 });
    }

    // Cek email sudah ada
    const existingEmail = await db.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email sudah terdaftar',
        }
      }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Cari rumah jika ada
    let house = null;
    if (houseNumber) {
      house = await db.house.findUnique({
        where: { houseNumber },
      });
    }

    // Buat user baru
    const user = await db.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
        fullName,
        phone: phone || null,
        role: 'WARGA',
        status: 'ACTIVE',
      },
    });

    // Buat resident jika ada rumah
    if (house) {
      await db.resident.create({
        data: {
          userId: user.id,
          houseId: house.id,
          relationship: 'OWNER',
        },
      });
    }

    // Log activity
    await logActivity({
      userId: user.id,
      action: 'REGISTER',
      module: 'AUTH',
      description: `Registrasi akun baru: ${username}`,
      details: { email, fullName, houseNumber },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
      },
      message: 'Registrasi berhasil. Silakan login.',
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan sistem',
      }
    }, { status: 500 });
  }
}
