const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const path = require("path");

const dbPath = path.resolve(__dirname, "..", "dev.db");
const dbUrl = `file:${dbPath}`;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const courses = await prisma.course.findMany({
    include: {
      _count: {
        select: {
          sections: true,
          questions: true,
          flashcards: true
        }
      }
    }
  });

  console.log("=== COURSE DATA COUNT IN RESTORED DB ===");
  courses.forEach(c => {
    console.log(`Course: "${c.name}" | Slug: "${c.slug}"`);
    console.log(`  Sections count: ${c._count.sections}`);
    console.log(`  Questions count: ${c._count.questions}`);
    console.log(`  Flashcards count: ${c._count.flashcards}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
