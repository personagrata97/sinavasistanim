const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

async function main() {
  const dbPath = path.resolve(__dirname, 'dev.db');
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  const p = new PrismaClient({ adapter });

  const course = await p.course.findUnique({
    where: { slug: "masak-uyum-gorevlisi" },
    include: {
      sections: {
        orderBy: { order: "asc" }
      }
    }
  });

  if (!course) {
    console.log("Course not found!");
    return;
  }

  console.log(`\n=== Course Status: ${course.status} ===`);
  for (const s of course.sections) {
    if (s.verificationScore < 95) {
      console.log(`Section #${s.order}: ${s.title} | Processed: ${s.processed} | Score: ${s.verificationScore}`);
    } else {
      console.log(`Section #${s.order}: ${s.title} | Processed: ${s.processed} | Score: ${s.verificationScore} (OK)`);
    }
  }

  await p.$disconnect();
}

main().catch(console.error);
