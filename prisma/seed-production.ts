import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function assertProductionSeedAllowed(): void {
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'YES') {
    throw new Error(
      'Production seed aborted. Set ALLOW_DESTRUCTIVE_SEED=YES to confirm the destructive cleanup step.'
    );
  }
}

async function truncateAllProductionTables(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "activity_logs",
      "payments",
      "blacklists",
      "violations",
      "guest_accesses",
      "access_records",
      "parking_slots",
      "vehicles",
      "residents",
      "users",
      "violation_types",
      "parking_areas",
      "houses"
    RESTART IDENTITY CASCADE;
  `);
}

async function seedUsers(hashedPassword: string) {
  return prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      email: 'admin@parkir.com',
      fullName: 'Administrator Utama',
      phone: '081234567890',
      role: 'ADMIN',
      status: 'ACTIVE',
      password: hashedPassword,
    },
    create: {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@parkir.com',
      fullName: 'Administrator Utama',
      phone: '081234567890',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
}

async function seedHouses() {
  const houseSeeds = [
    { houseNumber: 'A-01', address: 'Jl. Melati No. 1', block: 'A', status: 'VACANT' },
    { houseNumber: 'A-02', address: 'Jl. Melati No. 2', block: 'A', status: 'VACANT' },
    { houseNumber: 'A-03', address: 'Jl. Melati No. 3', block: 'A', status: 'VACANT' },
    { houseNumber: 'B-01', address: 'Jl. Mawar No. 1', block: 'B', status: 'VACANT' },
    { houseNumber: 'B-02', address: 'Jl. Mawar No. 2', block: 'B', status: 'VACANT' },
    { houseNumber: 'B-03', address: 'Jl. Mawar No. 3', block: 'B', status: 'VACANT' },
    { houseNumber: 'C-01', address: 'Jl. Anggrek No. 1', block: 'C', status: 'VACANT' },
    { houseNumber: 'C-02', address: 'Jl. Anggrek No. 2', block: 'C', status: 'VACANT' },
  ] as const;

  return Promise.all(
    houseSeeds.map((house) =>
      prisma.house.upsert({
        where: { houseNumber: house.houseNumber },
        update: {
          address: house.address,
          block: house.block,
          status: house.status,
        },
        create: {
          houseNumber: house.houseNumber,
          address: house.address,
          block: house.block,
          status: house.status,
        },
      })
    )
  );
}

async function seedParkingAreas() {
  const mainArea = await prisma.parkingArea.upsert({
    where: { id: 'main-parking' },
    update: {
      name: 'Area Parkir Utama',
      type: 'MAIN',
      capacity: 100,
      motorSlots: 50,
      mobilSlots: 50,
      currentOccupancy: 0,
      currentMotor: 0,
      currentMobil: 0,
      status: 'AVAILABLE',
    },
    create: {
      id: 'main-parking',
      name: 'Area Parkir Utama',
      type: 'MAIN',
      capacity: 100,
      motorSlots: 50,
      mobilSlots: 50,
      currentOccupancy: 0,
      currentMotor: 0,
      currentMobil: 0,
      status: 'AVAILABLE',
    },
  });

  const guestArea = await prisma.parkingArea.upsert({
    where: { id: 'guest-parking' },
    update: {
      name: 'Area Parkir Tamu',
      type: 'GUEST',
      capacity: 20,
      motorSlots: 10,
      mobilSlots: 10,
      currentOccupancy: 0,
      currentMotor: 0,
      currentMobil: 0,
      status: 'AVAILABLE',
    },
    create: {
      id: 'guest-parking',
      name: 'Area Parkir Tamu',
      type: 'GUEST',
      capacity: 20,
      motorSlots: 10,
      mobilSlots: 10,
      currentOccupancy: 0,
      currentMotor: 0,
      currentMobil: 0,
      status: 'AVAILABLE',
    },
  });

  await prisma.parkingArea.upsert({
    where: { id: 'overflow-parking' },
    update: {
      name: 'Area Parkir Cadangan',
      type: 'OVERFLOW',
      capacity: 50,
      motorSlots: 25,
      mobilSlots: 25,
      currentOccupancy: 0,
      currentMotor: 0,
      currentMobil: 0,
      status: 'AVAILABLE',
    },
    create: {
      id: 'overflow-parking',
      name: 'Area Parkir Cadangan',
      type: 'OVERFLOW',
      capacity: 50,
      motorSlots: 25,
      mobilSlots: 25,
      currentOccupancy: 0,
      currentMotor: 0,
      currentMobil: 0,
      status: 'AVAILABLE',
    },
  });

  return { mainArea, guestArea };
}

async function seedParkingSlots(mainAreaId: string, guestAreaId: string): Promise<void> {
  const slotTasks: Promise<unknown>[] = [];

  for (let index = 1; index <= 50; index++) {
    slotTasks.push(
      prisma.parkingSlot.upsert({
        where: { areaId_slotNumber: { areaId: mainAreaId, slotNumber: `M-${index.toString().padStart(2, '0')}` } },
        update: { slotType: 'MOTOR', status: 'AVAILABLE' },
        create: {
          areaId: mainAreaId,
          slotNumber: `M-${index.toString().padStart(2, '0')}`,
          slotType: 'MOTOR',
          status: 'AVAILABLE',
        },
      })
    );
  }

  for (let index = 1; index <= 50; index++) {
    slotTasks.push(
      prisma.parkingSlot.upsert({
        where: { areaId_slotNumber: { areaId: mainAreaId, slotNumber: `C-${index.toString().padStart(2, '0')}` } },
        update: { slotType: 'MOBIL', status: 'AVAILABLE' },
        create: {
          areaId: mainAreaId,
          slotNumber: `C-${index.toString().padStart(2, '0')}`,
          slotType: 'MOBIL',
          status: 'AVAILABLE',
        },
      })
    );
  }

  for (let index = 1; index <= 10; index++) {
    slotTasks.push(
      prisma.parkingSlot.upsert({
        where: { areaId_slotNumber: { areaId: guestAreaId, slotNumber: `TM-${index.toString().padStart(2, '0')}` } },
        update: { slotType: 'MOTOR', status: 'AVAILABLE' },
        create: {
          areaId: guestAreaId,
          slotNumber: `TM-${index.toString().padStart(2, '0')}`,
          slotType: 'MOTOR',
          status: 'AVAILABLE',
        },
      })
    );
  }

  for (let index = 1; index <= 10; index++) {
    slotTasks.push(
      prisma.parkingSlot.upsert({
        where: { areaId_slotNumber: { areaId: guestAreaId, slotNumber: `TC-${index.toString().padStart(2, '0')}` } },
        update: { slotType: 'MOBIL', status: 'AVAILABLE' },
        create: {
          areaId: guestAreaId,
          slotNumber: `TC-${index.toString().padStart(2, '0')}`,
          slotType: 'MOBIL',
          status: 'AVAILABLE',
        },
      })
    );
  }

  await Promise.all(slotTasks);
}

async function seedViolationTypes(): Promise<void> {
  await Promise.all([
    prisma.violationType.upsert({
      where: { code: 'PARKIR_AREA_SALAH' },
      update: {
        name: 'Parkir di Luar Area yang Ditentukan',
        description: 'Kendaraan parkir di area yang bukan tempat parkir resmi',
        baseFine: 50000,
        isActive: true,
      },
      create: {
        code: 'PARKIR_AREA_SALAH',
        name: 'Parkir di Luar Area yang Ditentukan',
        description: 'Kendaraan parkir di area yang bukan tempat parkir resmi',
        baseFine: 50000,
        isActive: true,
      },
    }),
    prisma.violationType.upsert({
      where: { code: 'PARKIR_JALUR_DARURAT' },
      update: {
        name: 'Parkir di Jalur Darurat',
        description: 'Kendaraan menghalangi jalur akses darurat',
        baseFine: 100000,
        isActive: true,
      },
      create: {
        code: 'PARKIR_JALUR_DARURAT',
        name: 'Parkir di Jalur Darurat',
        description: 'Kendaraan menghalangi jalur akses darurat',
        baseFine: 100000,
        isActive: true,
      },
    }),
    prisma.violationType.upsert({
      where: { code: 'OVER_TIME' },
      update: {
        name: 'Parkir Melebihi Batas Waktu',
        description: 'Parkir tamu melebihi durasi yang diizinkan',
        baseFine: 25000,
        isActive: true,
      },
      create: {
        code: 'OVER_TIME',
        name: 'Parkir Melebihi Batas Waktu',
        description: 'Parkir tamu melebihi durasi yang diizinkan',
        baseFine: 25000,
        isActive: true,
      },
    }),
    prisma.violationType.upsert({
      where: { code: 'MERUSAK_FASILITAS' },
      update: {
        name: 'Merusak Fasilitas Parkir',
        description: 'Kendaraan merusak fasilitas area parkir',
        baseFine: 0,
        isActive: true,
      },
      create: {
        code: 'MERUSAK_FASILITAS',
        name: 'Merusak Fasilitas Parkir',
        description: 'Kendaraan merusak fasilitas area parkir',
        baseFine: 0,
        isActive: true,
      },
    }),
    prisma.violationType.upsert({
      where: { code: 'LAIN_LAIN' },
      update: {
        name: 'Pelanggaran Lain-lain',
        description: 'Pelanggaran lain yang tidak tercantum',
        baseFine: 25000,
        isActive: true,
      },
      create: {
        code: 'LAIN_LAIN',
        name: 'Pelanggaran Lain-lain',
        description: 'Pelanggaran lain yang tidak tercantum',
        baseFine: 25000,
        isActive: true,
      },
    }),
  ]);
}

async function main() {
  assertProductionSeedAllowed();

  console.log('Starting production cleanup and seed...');
  const rawSeedPassword = process.env.PROD_SEED_PASSWORD;
  if (!rawSeedPassword) {
    throw new Error('Production seed requires PROD_SEED_PASSWORD environment variable to be set to a secure password');
  }
  const hashedPassword = await bcrypt.hash(rawSeedPassword, 10);

  await prisma.$transaction(async () => {
    await truncateAllProductionTables();

    await seedUsers(hashedPassword);
    const houses = await seedHouses();
    const { mainArea, guestArea } = await seedParkingAreas();
    await seedParkingSlots(mainArea.id, guestArea.id);
    await seedViolationTypes();

    // Keep the structure ready for demo without adding fake operational data.
    console.log(`Seeded ${houses.length} houses, 1 admin account, parking areas, slots, and violation types.`);
  });

  console.log('Production clean seed completed successfully.');
  console.log('Note: seeded admin password is not printed; set PROD_SEED_PASSWORD to control it.');
}

main()
  .catch((error) => {
    console.error('Production seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });