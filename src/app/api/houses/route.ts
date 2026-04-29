import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vacantOnly = searchParams.get('vacant') === 'true';

    const houses = await db.house.findMany({
      where: vacantOnly ? {
        residents: {
          none: {}
        }
      } : {},
      orderBy: [
        { block: 'asc' },
        { houseNumber: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: houses,
    });
  } catch (error) {
    console.error('Get houses error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}


// POST - Create new house (Admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Hanya admin yang dapat menambah rumah' }
      }, { status: 403 });
    }

    const body = await request.json();
    const { houseNumber, block, address, status } = body;

    if (!houseNumber || !block) {
      return NextResponse.json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'houseNumber dan block wajib' }
      }, { status: 400 });
    }

    // Check duplicate houseNumber
    const existing = await db.house.findUnique({
      where: { houseNumber }
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: { code: 'DUPLICATE', message: 'houseNumber sudah ada' }
      }, { status: 409 });
    }

    const house = await db.house.create({
      data: {
        houseNumber,
        block,
        address: address || null,
        status: status || 'OCCUPIED',
      }
    });

    return NextResponse.json({
      success: true,
      data: house,
      message: 'Rumah berhasil ditambahkan',
    }, { status: 201 });
  } catch (error) {
    console.error('Create house error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}

