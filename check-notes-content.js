const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const path = require("path");

const dbPath = path.resolve(process.cwd(), "dev.db");
const dbUrl = `file:${dbPath}`;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const sections = await prisma.section.findMany({
    where: { course: { slug: "masak-uyum-gorevlisi" } },
    orderBy: { order: "asc" },
    take: 3
  });

  sections.forEach((s, idx) => {
    console.log(`\n================ SECTION ${s.order}: ${s.title} ================`);
    console.log(s.notes);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
