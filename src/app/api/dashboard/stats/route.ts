import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Tidak terautentikasi' }
      }, { status: 401 });
    }

    // 🛠️ AUTO-HEALING DB: Membersihkan seluruh Zombie Slots di database
    await db.$executeRaw`
      UPDATE "parking_slots"
      SET "status" = 'AVAILABLE', "vehicleId" = NULL, "occupiedAt" = NULL
      WHERE "status" = 'OCCUPIED'
      AND NOT EXISTS (
        SELECT 1 FROM "access_records" ar
        WHERE ar."vehicleId" = "parking_slots"."vehicleId" AND ar."status" = 'ACTIVE'
      )
    `;

    // 🛠️ Sinkronisasi Ulang Angka di Tabel Parking Areas
    await db.$executeRaw`
      UPDATE "parking_areas" pa
      SET 
        "currentMotor" = (SELECT COUNT(*) FROM "parking_slots" ps WHERE ps."areaId" = pa.id AND ps."status" = 'OCCUPIED' AND ps."slotType" = 'MOTOR'),
        "currentMobil" = (SELECT COUNT(*) FROM "parking_slots" ps WHERE ps."areaId" = pa.id AND ps."status" = 'OCCUPIED' AND ps."slotType" = 'MOBIL'),
        "currentOccupancy" = (SELECT COUNT(*) FROM "parking_slots" ps WHERE ps."areaId" = pa.id AND ps."status" = 'OCCUPIED')
    `;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);

    const accessAgg = (await db.$queryRaw`
      SELECT
        COUNT(*) FILTER (WHERE "entryTime" >= ${today})::int AS "todayEntries",
        COUNT(*) FILTER (WHERE "exitTime" >= ${today})::int AS "todayExits",
        COUNT(*) FILTER (WHERE "status" = 'ACTIVE')::int AS "currentParked"
      FROM "access_records"
    `) as Array<{ todayEntries: number; todayExits: number; currentParked: number }>;

    const activeGuestsRes = (await db.$queryRaw`
      SELECT COUNT(*)::int AS cnt
      FROM "guest_accesses" ga
      JOIN "access_records" ar ON ga."accessRecordId" = ar.id
      WHERE ar."status" = 'ACTIVE'
    `) as Array<{ cnt: number }>;

    const [mainArea, guestArea] = await Promise.all([
      db.parkingArea.findUnique({ where: { id: 'main-parking' }, select: { capacity: true, motorSlots: true, mobilSlots: true } }),
      db.parkingArea.findUnique({ where: { id: 'guest-parking' }, select: { capacity: true, motorSlots: true, mobilSlots: true } }),
    ]);

    const occupiedSlots = (await db.$queryRaw`
      SELECT "areaId", "slotType", COUNT(*)::int AS cnt
      FROM "parking_slots"
      WHERE "areaId" IN ('main-parking','guest-parking') AND "status" = 'OCCUPIED'
      GROUP BY "areaId", "slotType"
    `) as Array<{ areaId: string; slotType: string; cnt: number }>;

    const violationsAgg = (await db.$queryRaw`
      SELECT
        COUNT(*) FILTER (WHERE "violationDate" >= ${today})::int AS "todayViolations",
        COUNT(*) FILTER (WHERE "violationDate" >= ${weekAgo})::int AS "weekViolations",
        COUNT(*) FILTER (WHERE "violationDate" >= ${monthAgo})::int AS "monthViolations",
        COUNT(*) FILTER (WHERE "status" = 'PENDING')::int AS "pendingFines",
        COALESCE(SUM("totalFine") FILTER (WHERE "status" = 'PENDING'),0)::float AS "totalUnpaid"
      FROM "violations"
    `) as Array<{ todayViolations: number; weekViolations: number; monthViolations: number; pendingFines: number; totalUnpaid: number }>;

    const vehiclesAgg = (await db.$queryRaw`
      SELECT
        COUNT(*)::int AS "totalVehicles",
        COUNT(*) FILTER (WHERE "status" = 'ACTIVE')::int AS "activeVehicles"
      FROM "vehicles"
    `) as Array<{ totalVehicles: number; activeVehicles: number }>;

    const blacklistedRes = (await db.$queryRaw`
      SELECT COUNT(*)::int AS cnt FROM "blacklists" WHERE "status" = 'ACTIVE'
    `) as Array<{ cnt: number }>;

    const todayEntries = Number(accessAgg[0]?.todayEntries || 0);
    const todayExits = Number(accessAgg[0]?.todayExits || 0);
    const currentParked = Number(accessAgg[0]?.currentParked || 0);
    const activeGuests = Number(activeGuestsRes[0]?.cnt || 0);

    const slotCountMap = (occupiedSlots as any[]).reduce<Record<string, number>>((acc, slot: any) => {
      acc[`${slot.areaId}:${slot.slotType}`] = Number(slot.cnt || 0);
      return acc;
    }, {});

    const todayViolations = Number(violationsAgg[0]?.todayViolations || 0);
    const weekViolations = Number(violationsAgg[0]?.weekViolations || 0);
    const monthViolations = Number(violationsAgg[0]?.monthViolations || 0);
    const pendingFines = Number(violationsAgg[0]?.pendingFines || 0);
    const unpaidTotal = Number(violationsAgg[0]?.totalUnpaid || 0);

    const totalVehicles = Number(vehiclesAgg[0]?.totalVehicles || 0);
    const activeVehicles = Number(vehiclesAgg[0]?.activeVehicles || 0);
    const blacklistedVehicles = Number(blacklistedRes[0]?.cnt || 0);

    const mainCurrentMotor = slotCountMap['main-parking:MOTOR'] || 0;
    const mainCurrentMobil = slotCountMap['main-parking:MOBIL'] || 0;
    const guestCurrentMotor = slotCountMap['guest-parking:MOTOR'] || 0;
    const guestCurrentMobil = slotCountMap['guest-parking:MOBIL'] || 0;

    const mainCapacity = mainArea?.capacity || 100;
    const mainMotorSlots = mainArea?.motorSlots || 50;
    const mainMobilSlots = mainArea?.mobilSlots || 50;
    const mainOccupied = mainCurrentMotor + mainCurrentMobil;

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
        totalUnpaid: unpaidTotal || 0,
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
    logger.error('Dashboard stats error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan sistem' }
    }, { status: 500 });
  }
}