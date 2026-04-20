import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tidak terautentikasi' }
      }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);

    // Get today's entries and exits
    const todayEntries = await db.accessRecord.count({
      where: {
        entryTime: {
          gte: today,
        },
      },
    });

    const todayExits = await db.accessRecord.count({
      where: {
        exitTime: {
          gte: today,
        },
      },
    });

    // Get current parked vehicles
    const currentParked = await db.accessRecord.count({
      where: {
        status: 'ACTIVE',
      },
    });

    // Get active guests
    const activeGuests = await db.guestAccess.count({
      where: {
        accessRecord: {
          status: 'ACTIVE',
        },
      },
    });

    // Get parking areas
    const mainArea = await db.parkingArea.findUnique({
      where: { id: 'main-parking' },
    });

    const guestArea = await db.parkingArea.findUnique({
      where: { id: 'guest-parking' },
    });

    // Get violations stats
    const todayViolations = await db.violation.count({
      where: {
        violationDate: {
          gte: today,
        },
      },
    });

    const weekViolations = await db.violation.count({
      where: {
        violationDate: {
          gte: weekAgo,
        },
      },
    });

    const monthViolations = await db.violation.count({
      where: {
        violationDate: {
          gte: monthAgo,
        },
      },
    });

    const pendingFines = await db.violation.count({
      where: {
        status: 'PENDING',
      },
    });

    const unpaidTotal = await db.violation.aggregate({
      where: {
        status: 'PENDING',
      },
      _sum: {
        totalFine: true,
      },
    });

    // Get vehicle stats
    const totalVehicles = await db.vehicle.count();
    const activeVehicles = await db.vehicle.count({
      where: { status: 'ACTIVE' },
    });
    const blacklistedVehicles = await db.blacklist.count({
      where: { status: 'ACTIVE' },
    });

    const stats = {
      today: {
        totalEntries: todayEntries,
        totalExits: todayExits,
        currentParked: currentParked,
        guests: activeGuests,
      },
      parking: {
        main: {
          capacity: mainArea?.capacity || 100,
          occupied: mainArea?.currentOccupancy || 0,
          percentage: mainArea ? Math.round((mainArea.currentOccupancy / mainArea.capacity) * 100) : 0,
          motorSlots: mainArea?.motorSlots || 50,
          mobilSlots: mainArea?.mobilSlots || 50,
          currentMotor: mainArea?.currentMotor || 0,
          currentMobil: mainArea?.currentMobil || 0,
          motorAvailable: (mainArea?.motorSlots || 50) - (mainArea?.currentMotor || 0),
          mobilAvailable: (mainArea?.mobilSlots || 50) - (mainArea?.currentMobil || 0),
        },
        guest: {
          capacity: guestArea?.capacity || 20,
          occupied: guestArea?.currentOccupancy || 0,
          percentage: guestArea ? Math.round((guestArea.currentOccupancy / guestArea.capacity) * 100) : 0,
          motorSlots: guestArea?.motorSlots || 10,
          mobilSlots: guestArea?.mobilSlots || 10,
          currentMotor: guestArea?.currentMotor || 0,
          currentMobil: guestArea?.currentMobil || 0,
          motorAvailable: (guestArea?.motorSlots || 10) - (guestArea?.currentMotor || 0),
          mobilAvailable: (guestArea?.mobilSlots || 10) - (guestArea?.currentMobil || 0),
        },
      },
      violations: {
        today: todayViolations,
        thisWeek: weekViolations,
        thisMonth: monthViolations,
        pendingFines: pendingFines,
        totalUnpaid: unpaidTotal._sum.totalFine || 0,
      },
      vehicles: {
        total: totalVehicles,
        active: activeVehicles,
        blacklisted: blacklistedVehicles,
      },
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}
