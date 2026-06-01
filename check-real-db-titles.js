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
    orderBy: { order: "asc" }
  });

  console.log("=== MASAK DB SECTIONS ===");
  sections.forEach(s => {
    console.log(`Order: ${s.order} | Title: "${s.title}" | Module: "${s.module}"`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
