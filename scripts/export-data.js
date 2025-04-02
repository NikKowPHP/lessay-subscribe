import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function exportData() {
  const data = await prisma.assessmentLesson.findMany({
    include: {
      steps: true, // Include related AssessmentStep records
    },
  });

  fs.writeFileSync('exported-data.json', JSON.stringify(data, null, 2));
  console.log('Data exported to exported-data.json');
}

exportData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });