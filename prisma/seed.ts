import { PrismaClient, UserRole, UserStatus, HouseStatus, VehicleType, VehicleCategory, VehicleStatus, ParkingAreaType, ParkingAreaStatus, ViolationTypeCode, SlotType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ==================== CREATE USERS ====================
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Admin
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@parkir.com',
      fullName: 'Administrator',
      phone: '081234567890',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // Satpam
  const satpam1 = await prisma.user.upsert({
    where: { username: 'satpam1' },
    update: {},
    create: {
      username: 'satpam1',
      password: hashedPassword,
      email: 'satpam1@parkir.com',
      fullName: 'Budi Santoso',
      phone: '081234567891',
      role: 'SATPAM',
      status: 'ACTIVE',
    },
  });

  const satpam2 = await prisma.user.upsert({
    where: { username: 'satpam2' },
    update: {},
    create: {
      username: 'satpam2',
      password: hashedPassword,
      email: 'satpam2@parkir.com',
      fullName: 'Andi Wijaya',
      phone: '081234567892',
      role: 'SATPAM',
      status: 'ACTIVE',
    },
  });

  // Pengelola
  const pengelola = await prisma.user.upsert({
    where: { username: 'pengelola' },
    update: {},
    create: {
      username: 'pengelola',
      password: hashedPassword,
      email: 'pengelola@parkir.com',
      fullName: 'Dewi Lestari',
      phone: '081234567893',
      role: 'PENGELOLA',
      status: 'ACTIVE',
    },
  });

  // Warga
  const warga1 = await prisma.user.upsert({
    where: { username: 'warga1' },
    update: {},
    create: {
      username: 'warga1',
      password: hashedPassword,
      email: 'warga1@parkir.com',
      fullName: 'Joko Widodo',
      phone: '081234567894',
      role: 'WARGA',
      status: 'ACTIVE',
    },
  });

  const warga2 = await prisma.user.upsert({
    where: { username: 'warga2' },
    update: {},
    create: {
      username: 'warga2',
      password: hashedPassword,
      email: 'warga2@parkir.com',
      fullName: 'Siti Rahayu',
      phone: '081234567895',
      role: 'WARGA',
      status: 'ACTIVE',
    },
  });

  const warga3 = await prisma.user.upsert({
    where: { username: 'warga3' },
    update: {},
    create: {
      username: 'warga3',
      password: hashedPassword,
      email: 'warga3@parkir.com',
      fullName: 'Ahmad Fauzi',
      phone: '081234567896',
      role: 'WARGA',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Users created');

  // ==================== CREATE HOUSES ====================
  const houses = await Promise.all([
    prisma.house.upsert({
      where: { houseNumber: 'A-01' },
      update: {},
      create: { houseNumber: 'A-01', address: 'Jl. Melati No. 1', block: 'A', status: 'OCCUPIED' },
    }),
    prisma.house.upsert({
      where: { houseNumber: 'A-02' },
      update: {},
      create: { houseNumber: 'A-02', address: 'Jl. Melati No. 2', block: 'A', status: 'OCCUPIED' },
    }),
    prisma.house.upsert({
      where: { houseNumber: 'A-03' },
      update: {},
      create: { houseNumber: 'A-03', address: 'Jl. Melati No. 3', block: 'A', status: 'OCCUPIED' },
    }),
    prisma.house.upsert({
      where: { houseNumber: 'B-01' },
      update: {},
      create: { houseNumber: 'B-01', address: 'Jl. Mawar No. 1', block: 'B', status: 'OCCUPIED' },
    }),
    prisma.house.upsert({
      where: { houseNumber: 'B-02' },
      update: {},
      create: { houseNumber: 'B-02', address: 'Jl. Mawar No. 2', block: 'B', status: 'OCCUPIED' },
    }),
    prisma.house.upsert({
      where: { houseNumber: 'B-03' },
      update: {},
      create: { houseNumber: 'B-03', address: 'Jl. Mawar No. 3', block: 'B', status: 'VACANT' },
    }),
    prisma.house.upsert({
      where: { houseNumber: 'C-01' },
      update: {},
      create: { houseNumber: 'C-01', address: 'Jl. Anggrek No. 1', block: 'C', status: 'OCCUPIED' },
    }),
    prisma.house.upsert({
      where: { houseNumber: 'C-02' },
      update: {},
      create: { houseNumber: 'C-02', address: 'Jl. Anggrek No. 2', block: 'C', status: 'OCCUPIED' },
    }),
  ]);

  console.log('✅ Houses created');

  // ==================== CREATE RESIDENTS ====================
  await prisma.resident.upsert({
    where: { userId: warga1.id },
    update: {},
    create: { userId: warga1.id, houseId: houses[0].id, relationship: 'OWNER' },
  });

  await prisma.resident.upsert({
    where: { userId: warga2.id },
    update: {},
    create: { userId: warga2.id, houseId: houses[1].id, relationship: 'OWNER' },
  });

  await prisma.resident.upsert({
    where: { userId: warga3.id },
    update: {},
    create: { userId: warga3.id, houseId: houses[3].id, relationship: 'TENANT' },
  });

  console.log('✅ Residents created');

  // ==================== CREATE PARKING AREAS ====================
  // Main Area: 50 motor + 50 mobil = 100 total
  const mainArea = await prisma.parkingArea.upsert({
    where: { id: 'main-parking' },
    update: {
      motorSlots: 50,
      mobilSlots: 50,
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

  // Guest Area: 10 motor + 10 mobil = 20 total
  const guestArea = await prisma.parkingArea.upsert({
    where: { id: 'guest-parking' },
    update: {
      motorSlots: 10,
      mobilSlots: 10,
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

  // Overflow Area: 25 motor + 25 mobil = 50 total
  const overflowArea = await prisma.parkingArea.upsert({
    where: { id: 'overflow-parking' },
    update: {
      motorSlots: 25,
      mobilSlots: 25,
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

  console.log('✅ Parking areas created');

  // ==================== CREATE PARKING SLOTS ====================
  // Main Area - 50 motor slots (M-01 to M-50)
  for (let i = 1; i <= 50; i++) {
    await prisma.parkingSlot.upsert({
      where: { areaId_slotNumber: { areaId: mainArea.id, slotNumber: `M-${i.toString().padStart(2, '0')}` } },
      update: { slotType: 'MOTOR' },
      create: {
        areaId: mainArea.id,
        slotNumber: `M-${i.toString().padStart(2, '0')}`,
        slotType: 'MOTOR',
        status: 'AVAILABLE',
      },
    });
  }

  // Main Area - 50 mobil slots (C-01 to C-50)
  for (let i = 1; i <= 50; i++) {
    await prisma.parkingSlot.upsert({
      where: { areaId_slotNumber: { areaId: mainArea.id, slotNumber: `C-${i.toString().padStart(2, '0')}` } },
      update: { slotType: 'MOBIL' },
      create: {
        areaId: mainArea.id,
        slotNumber: `C-${i.toString().padStart(2, '0')}`,
        slotType: 'MOBIL',
        status: 'AVAILABLE',
      },
    });
  }

  // Guest Area - 10 motor slots (TM-01 to TM-10)
  for (let i = 1; i <= 10; i++) {
    await prisma.parkingSlot.upsert({
      where: { areaId_slotNumber: { areaId: guestArea.id, slotNumber: `TM-${i.toString().padStart(2, '0')}` } },
      update: { slotType: 'MOTOR' },
      create: {
        areaId: guestArea.id,
        slotNumber: `TM-${i.toString().padStart(2, '0')}`,
        slotType: 'MOTOR',
        status: 'AVAILABLE',
      },
    });
  }

  // Guest Area - 10 mobil slots (TC-01 to TC-10)
  for (let i = 1; i <= 10; i++) {
    await prisma.parkingSlot.upsert({
      where: { areaId_slotNumber: { areaId: guestArea.id, slotNumber: `TC-${i.toString().padStart(2, '0')}` } },
      update: { slotType: 'MOBIL' },
      create: {
        areaId: guestArea.id,
        slotNumber: `TC-${i.toString().padStart(2, '0')}`,
        slotType: 'MOBIL',
        status: 'AVAILABLE',
      },
    });
  }

  console.log('✅ Parking slots created');

  // ==================== CREATE VIOLATION TYPES ====================
  await Promise.all([
    prisma.violationType.upsert({
      where: { code: 'PARKIR_AREA_SALAH' },
      update: {},
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
      update: {},
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
      update: {},
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
      update: {},
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
      update: {},
      create: {
        code: 'LAIN_LAIN',
        name: 'Pelanggaran Lain-lain',
        description: 'Pelanggaran lain yang tidak tercantum',
        baseFine: 25000,
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Violation types created');

  // ==================== CREATE SAMPLE VEHICLES ====================
  await Promise.all([
    prisma.vehicle.upsert({
      where: { platNumber: 'B 1234 ABC' },
      update: { userId: warga1.id },
      create: {
        platNumber: 'B 1234 ABC',
        vehicleType: 'MOTOR',
        brand: 'Honda',
        color: 'Hitam',
        category: 'WARGA',
        status: 'ACTIVE',
        houseId: houses[0].id,
        userId: warga1.id,
      },
    }),
    prisma.vehicle.upsert({
      where: { platNumber: 'B 5678 DEF' },
      update: { userId: warga1.id },
      create: {
        platNumber: 'B 5678 DEF',
        vehicleType: 'SEDAN',
        brand: 'Toyota',
        color: 'Putih',
        category: 'WARGA',
        status: 'ACTIVE',
        houseId: houses[0].id,
        userId: warga1.id,
      },
    }),
    prisma.vehicle.upsert({
      where: { platNumber: 'D 1111 GHI' },
      update: { userId: warga2.id },
      create: {
        platNumber: 'D 1111 GHI',
        vehicleType: 'MOTOR',
        brand: 'Yamaha',
        color: 'Merah',
        category: 'WARGA',
        status: 'ACTIVE',
        houseId: houses[1].id,
        userId: warga2.id,
      },
    }),
    prisma.vehicle.upsert({
      where: { platNumber: 'D 2222 JKL' },
      update: { userId: warga3.id },
      create: {
        platNumber: 'D 2222 JKL',
        vehicleType: 'MINIBUS',
        brand: 'Honda',
        color: 'Silver',
        category: 'WARGA',
        status: 'ACTIVE',
        houseId: houses[3].id,
        userId: warga3.id,
      },
    }),
    prisma.vehicle.upsert({
      where: { platNumber: 'F 3333 MNO' },
      update: {},
      create: {
        platNumber: 'F 3333 MNO',
        vehicleType: 'PICKUP',
        brand: 'Mitsubishi',
        color: 'Biru',
        category: 'SERVICE',
        status: 'ACTIVE',
        houseId: null,
        userId: null,
      },
    }),
  ]);

  console.log('✅ Sample vehicles created');

  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📋 Login credentials:');
  console.log('   Admin: admin / password123');
  console.log('   Satpam: satpam1 / password123');
  console.log('   Warga: warga1 / password123');
  console.log('   Pengelola: pengelola / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
