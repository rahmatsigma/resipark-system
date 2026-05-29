import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const houses = await prisma.house.count();
  const slots = await prisma.parkingSlot.count();
  const areas = await prisma.parkingArea.count();

  console.log('Seed verification:', { users, houses, slots, areas });
}

main()
  .catch((e) => {
    console.error('Check failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
