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

  const lines = s.notes.split("\n");
  const idx = lines.findIndex(l => l.includes("MASAK Fonksiyonları ve Teşkilat Yapısı"));
  if (idx !== -1) {
    console.log("=== MASAK Fonksiyonları Context ===");
    console.log(lines.slice(idx, idx + 20).join("\n"));
  } else {
    console.log("Not found 'MASAK Fonksiyonları'");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
