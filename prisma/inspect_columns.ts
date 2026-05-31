import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  for (const table of ['access_records', 'violations', 'parking_slots', 'vehicles', 'blacklists']) {
    const cols = await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`) as Array<{ column_name: string }>;
    console.log('\n' + table + ':', cols.map((c) => c.column_name).join(', '));
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
