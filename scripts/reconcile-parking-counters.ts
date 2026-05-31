import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// If DIRECT_URL is provided in .env (bypasses pgbouncer), prefer it
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL in environment. Set it in .env before running.');
  process.exit(1);
}

// Create a local PrismaClient instance to avoid import cycles
const db = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

type AreaCounts = {
  areaId: string;
  occupied_total: number;
  occupied_motor: number;
  occupied_mobil: number;
};

async function getSlotCounts(): Promise<AreaCounts[]> {
  // Raw query to aggregate counts; uses Prisma's $queryRaw for portability
  const rows: any[] = await db.$queryRaw`
    SELECT area_id as "areaId",
      SUM(CASE WHEN status='OCCUPIED' THEN 1 ELSE 0 END) AS occupied_total,
      SUM(CASE WHEN status='OCCUPIED' AND slot_type='MOTOR' THEN 1 ELSE 0 END) AS occupied_motor,
      SUM(CASE WHEN status='OCCUPIED' AND slot_type!='MOTOR' THEN 1 ELSE 0 END) AS occupied_mobil
    FROM parking_slots
    GROUP BY area_id
  `;

  return rows.map((r) => ({
    areaId: r.areaId,
    occupied_total: Number(r.occupied_total || 0),
    occupied_motor: Number(r.occupied_motor || 0),
    occupied_mobil: Number(r.occupied_mobil || 0),
  }));
}

async function getAreas() {
  const areas = await db.parkingArea.findMany();
  return areas;
}

async function main() {
  console.log('Reading parking slot counts...');
  const counts = await getSlotCounts();
  const areas = await getAreas();

  const countsMap = new Map(counts.map((c) => [c.areaId, c]));

  const diffs: Array<{ id: string; currentOccupancy: number; real: number; currentMotor: number; realMotor: number; currentMobil: number; realMobil: number }> = [];

  for (const a of areas) {
    const c = countsMap.get(a.id) || { occupied_total: 0, occupied_motor: 0, occupied_mobil: 0 };
    if (a.currentOccupancy !== c.occupied_total || a.currentMotor !== c.occupied_motor || a.currentMobil !== c.occupied_mobil) {
      diffs.push({ id: a.id, currentOccupancy: a.currentOccupancy, real: c.occupied_total, currentMotor: a.currentMotor, realMotor: c.occupied_motor, currentMobil: a.currentMobil, realMobil: c.occupied_mobil });
    }
  }

  if (diffs.length === 0) {
    console.log('No differences found between parking_areas and parking_slots. Nothing to do.');
    await db.$disconnect();
    process.exit(0);
  }

  console.log('\nFound differences for areas:');
  for (const d of diffs) {
    console.log(`- ${d.id}: currentOccupancy=${d.currentOccupancy} -> real=${d.real}, currentMotor=${d.currentMotor} -> realMotor=${d.realMotor}, currentMobil=${d.currentMobil} -> realMobil=${d.realMobil}`);
  }

  const apply = process.argv.includes('--apply');
  if (!apply) {
    console.log('\nRun this script again with --apply to update parking_areas to match parking_slots.');
    console.log('Example: npx ts-node scripts/reconcile-parking-counters.ts --apply');
    await db.$disconnect();
    process.exit(0);
  }

  console.log('\nApplying updates (in a transaction)...');

  await db.$transaction(async (tx) => {
    // compute counts map again inside transaction to ensure consistency
    const rows: any[] = await tx.$queryRaw`
      SELECT area_id as "areaId",
        SUM(CASE WHEN status='OCCUPIED' THEN 1 ELSE 0 END) AS occupied_total,
        SUM(CASE WHEN status='OCCUPIED' AND slot_type='MOTOR' THEN 1 ELSE 0 END) AS occupied_motor,
        SUM(CASE WHEN status='OCCUPIED' AND slot_type!='MOTOR' THEN 1 ELSE 0 END) AS occupied_mobil
      FROM parking_slots
      GROUP BY area_id
    `;

    const txnCounts = new Map(rows.map((r) => [r.areaId, { total: Number(r.occupied_total || 0), motor: Number(r.occupied_motor || 0), mobil: Number(r.occupied_mobil || 0) }]));

    for (const a of areas) {
      const c = txnCounts.get(a.id) || { total: 0, motor: 0, mobil: 0 };
      if (a.currentOccupancy !== c.total || a.currentMotor !== c.motor || a.currentMobil !== c.mobil) {
        console.log(`Updating area ${a.id}: occupancy ${a.currentOccupancy} -> ${c.total}`);
        await tx.parkingArea.update({
          where: { id: a.id },
          data: {
            currentOccupancy: c.total,
            currentMotor: c.motor,
            currentMobil: c.mobil,
          },
        });
      }
    }
  });

  console.log('Update complete.');
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error('Script error:', err);
  try { await db.$disconnect(); } catch (e) {}
  process.exit(1);
});
