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
  const idx = lines.findIndex(l => l.includes("MASAK'ın Doğuş Hikayesi"));
  if (idx !== -1) {
    console.log("=== MASAK'in Dogus Hikayesi Context ===");
    console.log(lines.slice(idx, idx + 25).join("\n"));
  } else {
    console.log("Not found 'MASAK'ın Doğuş Hikayesi'");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
