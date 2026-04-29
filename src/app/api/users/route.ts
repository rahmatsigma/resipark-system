import type { HouseWithResidents } from '@/types';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 10);
}

// GET - List users
export async function GET(request: NextRequest) {
  // ... GET logic unchanged
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Hanya admin yang dapat mengakses' }
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { fullName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (role && role !== 'all') {
      where.role = role;
    }

    const total = await db.user.count({ where });
    const totalPages = Math.ceil(total / limit);

    const users = await db.user.findMany({
      where,
      include: {
        resident: {
          include: {
            house: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        role: u.role,
        status: u.status,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
        house: u.resident?.house || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}

// POST - Create user
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Hanya admin yang dapat membuat user' }
      }, { status: 403 });
    }

    const body = await request.json();
    const { username, email, fullName, phone, role, status, password, houseId } = body;

    if (!username || !email || !fullName || !password) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Field wajib harus diisi' }
      }, { status: 400 });
    }

    // Check existing
    const existing = await db.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: { code: 'DUPLICATE', message: existing.username === username ? 'Username sudah digunakan' : 'Email sudah digunakan' }
      }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    // Validate house available if WARGA
    let house: HouseWithResidents | null = null;
    if (houseId && role === 'WARGA') {
      house = await db.house.findUnique({
        where: { id: houseId },
        include: { residents: true }
      });
      
      if (!house) {
        return NextResponse.json({
          success: false,
          error: { code: 'HOUSE_NOT_FOUND', message: 'Rumah tidak ditemukan' }
        }, { status: 404 });
      }
      
      if (house.residents.length > 0) {
        return NextResponse.json({
          success: false,
          error: { code: 'HOUSE_OCCUPIED', message: 'Rumah sudah ditempati' }
        }, { status: 400 });
      }
    }

    const result = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          email,
          fullName,
          phone: phone || null,
          role: role || 'WARGA',
          status: status || 'ACTIVE',
          password: hashedPassword,
        },
      });

      if (houseId && (role === 'WARGA')) {
        await tx.resident.create({
          data: {
            userId: newUser.id,
            houseId,
            relationship: 'OWNER',
          },
        });
      }

      return newUser;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'User berhasil dibuat',
    }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}

