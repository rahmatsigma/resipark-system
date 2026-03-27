import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity';
import { checkVehicleQuota, validatePlatNumber } from '@/lib/rules';

// GET - Get vehicle by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tidak terautentikasi' }
      }, { status: 401 });
    }

    const { id } = await params;

    const vehicle = await db.vehicle.findUnique({
      where: { id },
      include: {
        house: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        blacklist: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kendaraan tidak ditemukan' }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error('Get vehicle error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}

// PUT - Update vehicle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'WARGA')) {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Tidak memiliki akses' }
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { platNumber, vehicleType, brand, color, category, status, houseId, userId } = body;

    const existingVehicle = await db.vehicle.findUnique({
      where: { id },
    });

    if (!existingVehicle) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kendaraan tidak ditemukan' }
      }, { status: 404 });
    }

    // For WARGA, check ownership by userId
    if (user.role === 'WARGA' && existingVehicle.userId !== user.id) {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Tidak memiliki akses' }
      }, { status: 403 });
    }

    const updateData: any = {};
    
    // Fields that can be updated by WARGA
    if (vehicleType) updateData.vehicleType = vehicleType;
    if (brand) updateData.brand = brand;
    if (color) updateData.color = color;

    // Admin-only fields
    if (user.role === 'ADMIN') {
      if (category) updateData.category = category;
      if (status) updateData.status = status;
      if (houseId !== undefined) updateData.houseId = houseId || null;
      if (userId !== undefined) updateData.userId = userId || null;
    }

    // WARGA can only update certain fields
    if (user.role === 'WARGA') {
      if (status) updateData.status = status; // Allow WARGA to deactivate their vehicle
    }

    // Check plat number uniqueness if changing (Admin only)
    if (platNumber && platNumber !== existingVehicle.platNumber) {
      if (user.role !== 'ADMIN') {
        return NextResponse.json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Hanya admin yang dapat mengubah plat nomor' }
        }, { status: 403 });
      }

      const platValidation = validatePlatNumber(platNumber);
      if (!platValidation.valid) {
        return NextResponse.json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: platValidation.error }
        }, { status: 400 });
      }

      const platExists = await db.vehicle.findUnique({
        where: { platNumber: platNumber.toUpperCase() },
      });
      if (platExists) {
        return NextResponse.json({
          success: false,
          error: { code: 'DUPLICATE_PLAT', message: 'Plat nomor sudah digunakan' }
        }, { status: 409 });
      }
      updateData.platNumber = platNumber.toUpperCase();
    }

    // Check quota if changing house (Admin only)
    if (houseId && houseId !== existingVehicle.houseId && category === 'WARGA') {
      const quota = await checkVehicleQuota(houseId);
      if (!quota.available) {
        return NextResponse.json({
          success: false,
          error: { 
            code: 'QUOTA_EXCEEDED', 
            message: `Kuota kendaraan rumah ini sudah penuh (${quota.current}/${quota.max})` 
          }
        }, { status: 403 });
      }
    }

    const vehicle = await db.vehicle.update({
      where: { id },
      data: updateData,
      include: {
        house: true,
      },
    });

    await logActivity({
      userId: user.id,
      action: ACTIVITY_TYPES.VEHICLE_UPDATE.action,
      module: ACTIVITY_TYPES.VEHICLE_UPDATE.module,
      description: `Mengupdate data kendaraan ${vehicle.platNumber}`,
      details: { vehicleId: id, changes: updateData },
    });

    return NextResponse.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}

// DELETE - Delete vehicle (soft delete for WARGA, permanent for ADMIN with permanent=true)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'WARGA')) {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Tidak memiliki akses' }
      }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    const vehicle = await db.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kendaraan tidak ditemukan' }
      }, { status: 404 });
    }

    // For WARGA, check ownership by userId
    if (user.role === 'WARGA' && vehicle.userId !== user.id) {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Tidak memiliki akses' }
      }, { status: 403 });
    }

    // Only ADMIN can permanently delete
    if (permanent && user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Hanya admin yang dapat menghapus permanen' }
      }, { status: 403 });
    }

    if (permanent) {
      // Permanent delete
      await db.vehicle.delete({
        where: { id },
      });

      await logActivity({
        userId: user.id,
        action: ACTIVITY_TYPES.VEHICLE_DELETE.action,
        module: ACTIVITY_TYPES.VEHICLE_DELETE.module,
        description: `Menghapus permanen kendaraan ${vehicle.platNumber}`,
        details: { vehicleId: id, platNumber: vehicle.platNumber, permanent: true },
      });

      return NextResponse.json({
        success: true,
        message: 'Kendaraan berhasil dihapus permanen',
      });
    } else {
      // Soft delete by setting status to INACTIVE
      await db.vehicle.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });

      await logActivity({
        userId: user.id,
        action: ACTIVITY_TYPES.VEHICLE_DELETE.action,
        module: ACTIVITY_TYPES.VEHICLE_DELETE.module,
        description: `Menonaktifkan kendaraan ${vehicle.platNumber}`,
        details: { vehicleId: id, platNumber: vehicle.platNumber, permanent: false },
      });

      return NextResponse.json({
        success: true,
        message: 'Kendaraan berhasil dinonaktifkan',
      });
    }
  } catch (error) {
    console.error('Delete vehicle error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
