import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity, ACTIVITY_TYPES } from '@/lib/activity';

// GET - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Hanya admin yang dapat mengakses' }
      }, { status: 403 });
    }

    const { id } = await params;

    const targetUser = await db.user.findUnique({
      where: { id },
      include: {
        resident: {
          include: {
            house: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
        fullName: targetUser.fullName,
        phone: targetUser.phone,
        role: targetUser.role,
        status: targetUser.status,
        lastLogin: targetUser.lastLogin,
        createdAt: targetUser.createdAt,
        house: targetUser.resident?.house || null,
        resident: targetUser.resident,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Hanya admin yang dapat mengubah user' }
      }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { fullName, email, phone, role, status, password, houseId } = body;

    const existingUser = await db.user.findUnique({
      where: { id },
      include: { resident: true },
    });

    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' }
      }, { status: 404 });
    }

    // Check duplicate email if changing
    if (email && email !== existingUser.email) {
      const duplicateEmail = await db.user.findUnique({
        where: { email },
      });
      if (duplicateEmail) {
        return NextResponse.json({
          success: false,
          error: { code: 'DUPLICATE', message: 'Email sudah digunakan' }
        }, { status: 409 });
      }
    }

    const result = await db.$transaction(async (tx) => {
      // Update user
      const updateData: any = {};
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone || null;
      if (role) updateData.role = role;
      if (status) updateData.status = status;

      if (password) {
        const bcrypt = await import('bcryptjs');
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await tx.user.update({
        where: { id },
        data: updateData,
      });

      // Update house assignment for WARGA role
      if (role === 'WARGA' || existingUser.role === 'WARGA') {
        // Delete existing resident if any
        if (existingUser.resident) {
          await tx.resident.delete({
            where: { userId: id },
          });
        }

        // Create new resident if houseId provided
        if (houseId) {
          await tx.resident.create({
            data: {
              userId: id,
              houseId,
              relationship: 'OWNER',
            },
          });
        }
      }

      return updatedUser;
    });

    await logActivity({
      userId: user.id,
      action: ACTIVITY_TYPES.USER_UPDATE?.action || 'USER_UPDATE',
      module: ACTIVITY_TYPES.USER_UPDATE?.module || 'USERS',
      description: `Mengupdate user: ${existingUser.username}`,
      details: { targetUserId: id, changes: body },
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'User berhasil diupdate',
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}

// DELETE - Soft delete user (set status to INACTIVE)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Hanya admin yang dapat menghapus user' }
      }, { status: 403 });
    }

    const { id } = await params;

    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' }
      }, { status: 404 });
    }

    // Prevent deleting self
    if (existingUser.id === user.id) {
      return NextResponse.json({
        success: false,
        error: { code: 'CANNOT_DELETE_SELF', message: 'Tidak dapat menghapus akun sendiri' }
      }, { status: 400 });
    }

    // Soft delete by setting status to INACTIVE
    await db.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    await logActivity({
      userId: user.id,
      action: ACTIVITY_TYPES.USER_DELETE?.action || 'USER_DELETE',
      module: ACTIVITY_TYPES.USER_DELETE?.module || 'USERS',
      description: `Menonaktifkan user: ${existingUser.username}`,
      details: { deletedUserId: id },
    });

    return NextResponse.json({
      success: true,
      message: 'User berhasil dinonaktifkan',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
