const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const path = require("path");

const dbPath = path.resolve(process.cwd(), "dev.db");
const dbUrl = `file:${dbPath}`;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const courses = await prisma.course.findMany({
    include: {
      _count: {
        select: { sections: true, flashcards: true, questions: true }
      }
    }
  });
  console.log("=== COURSES ===");
  courses.forEach(c => {
    console.log(`Course: ${c.name} | Slug: ${c.slug} | Status: ${c.status}`);
    console.log(`  Sections: ${c._count.sections} | Flashcards: ${c._count.flashcards} | Questions: ${c._count.questions}`);
  });

  const processedSections = await prisma.section.findMany({
    where: { processed: true },
    select: { id: true, title: true, course: { select: { name: true, slug: true } }, notes: true }
  });
  console.log("\n=== PROCESSED SECTIONS ===");
  console.log(`Total processed sections: ${processedSections.length}`);
  processedSections.forEach(s => {
    console.log(`- Section: ${s.title} (Course: ${s.course.name} [${s.course.slug}])`);
    console.log(`  Notes length: ${s.notes ? s.notes.length : 0} chars`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
