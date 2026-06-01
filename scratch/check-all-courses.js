const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const path = require("path");

const dbPath = path.resolve(__dirname, "..", "dev.db");
const dbUrl = `file:${dbPath}`;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const programs = await prisma.program.findMany({
    include: { courses: true }
  });
  console.log("=== PROGRAMS AND COURSES IN DB ===");
  programs.forEach(p => {
    console.log(`Program: ${p.name} | Slug: ${p.slug}`);
    p.courses.forEach(c => {
      console.log(`  Course: ${c.name} | Slug: ${c.slug}`);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
