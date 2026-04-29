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

    // Get parking areas config
    const mainArea = await db.parkingArea.findUnique({
      where: { id: 'main-parking' },
    });

    const guestArea = await db.parkingArea.findUnique({
      where: { id: 'guest-parking' },
    });

    // Get real-time occupancy from ParkingSlot (bypass stale cached counters)
    const mainCurrentMotor = await db.parkingSlot.count({
      where: {
        areaId: 'main-parking',
        status: 'OCCUPIED',
        slotType: 'MOTOR',
      },
    });

    const mainCurrentMobil = await db.parkingSlot.count({
      where: {
        areaId: 'main-parking',
        status: 'OCCUPIED',
        slotType: 'MOBIL',
      },
    });

    const guestCurrentMotor = await db.parkingSlot.count({
      where: {
        areaId: 'guest-parking',
        status: 'OCCUPIED',
        slotType: 'MOTOR',
      },
    });

    const guestCurrentMobil = await db.parkingSlot.count({
      where: {
        areaId: 'guest-parking',
        status: 'OCCUPIED',
        slotType: 'MOBIL',
      },
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

    // Build main area stats from real slot occupancy
    const mainCapacity = mainArea?.capacity || 100;
    const mainMotorSlots = mainArea?.motorSlots || 50;
    const mainMobilSlots = mainArea?.mobilSlots || 50;
    const mainOccupied = mainCurrentMotor + mainCurrentMobil;

    // Build guest area stats from real slot occupancy
    const guestCapacity = guestArea?.capacity || 20;
    const guestMotorSlots = guestArea?.motorSlots || 10;
    const guestMobilSlots = guestArea?.mobilSlots || 10;
    const guestOccupied = guestCurrentMotor + guestCurrentMobil;

    const stats = {
      today: {
        totalEntries: todayEntries,
        totalExits: todayExits,
        currentParked: currentParked,
        guests: activeGuests,
      },
      parking: {
        main: {
          capacity: mainCapacity,
          occupied: mainOccupied,
          percentage: Math.round((mainOccupied / mainCapacity) * 100),
          motorSlots: mainMotorSlots,
          mobilSlots: mainMobilSlots,
          currentMotor: mainCurrentMotor,
          currentMobil: mainCurrentMobil,
          motorAvailable: mainMotorSlots - mainCurrentMotor,
          mobilAvailable: mainMobilSlots - mainCurrentMobil,
        },
        guest: {
          capacity: guestCapacity,
          occupied: guestOccupied,
          percentage: Math.round((guestOccupied / guestCapacity) * 100),
          motorSlots: guestMotorSlots,
          mobilSlots: guestMobilSlots,
          currentMotor: guestCurrentMotor,
          currentMobil: guestCurrentMobil,
          motorAvailable: guestMotorSlots - guestCurrentMotor,
          mobilAvailable: guestMobilSlots - guestCurrentMobil,
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
