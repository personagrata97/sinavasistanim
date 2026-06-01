const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const path = require("path");

const dbPath = path.resolve(process.cwd(), "dev.db");
const dbUrl = `file:${dbPath}`;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const s = await prisma.section.findFirst({
    where: { 
      course: { slug: "masak-uyum-gorevlisi" },
      order: 1
    }
  });

  console.log("=== SECTION 1 NOTES ===");
  console.log(s.notes);
}

main().catch(console.error).finally(() => prisma.$disconnect());
