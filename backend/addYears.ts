import prisma from './src/lib/prisma.js';

async function main() {
  const result = await prisma.academicYear.createMany({
    data: [
      { label: '2024-25', startDate: new Date('2024-04-01'), endDate: new Date('2025-03-31') },
      { label: '2025-26', startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31') },
      { label: '2026-27', startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31') },
    ],
    skipDuplicates: true,
  });
  console.log('Created:', result);
  await prisma.$disconnect();
}

main().catch(console.error);