const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const path = require("path");

const dbPath = path.resolve(process.cwd(), "dev.db");
const dbUrl = `file:${dbPath}`;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: "masak-uyum-gorevlisi" },
    include: {
      sections: {
        orderBy: { order: "asc" }
      }
    }
  });

  if (!course) {
    console.log("masak-uyum-gorevlisi course not found.");
    return;
  }

  console.log(`Course: ${course.name} | Slug: ${course.slug}`);
  console.log(`Total sections: ${course.sections.length}`);
  course.sections.forEach(s => {
    console.log(`  Section ${s.order}: ${s.title} | Processed: ${s.processed} | Notes present: ${s.notes !== null}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
