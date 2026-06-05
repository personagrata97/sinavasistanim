import { prisma } from '../src/lib/prisma';
import fs from 'fs';

async function run() {
  const content = fs.readFileSync('scratch/sec1_bsg_notes.md', 'utf-8');
  await prisma.section.update({
    where: { id: 'cmq11hnzk0000rrp1wdrv5ado' },
    data: {
      notes: content,
      processed: false,
      verificationScore: 100,
      verificationIssues: null
    }
  });
  console.log('Restored section 1 notes successfully.');
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
