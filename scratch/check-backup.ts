import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import path from "path"

const dbPath = path.resolve(process.cwd(), "dev_25mayısakşam2358.db")
const dbUrl = `file:${dbPath}`
const adapter = new PrismaBetterSqlite3({ url: dbUrl })
const prisma = new PrismaClient({ adapter })

async function run() {
  console.log("Checking Section 1 in backup database...")
  const s = await prisma.section.findFirst({
    where: {
      course: { slug: "masak-uyum-gorevlisi" },
      order: 1
    }
  })
  if (s) {
    console.log(`Backup Section 1: ${s.title}`)
    console.log(`Score: ${s.verificationScore}%`)
    console.log(`Notes Length: ${s.notes ? s.notes.length : "null"}`)
    if (s.notes) {
      console.log(`Notes sample: ${s.notes.substring(0, 200)}...`)
    }
  } else {
    console.log("Section 1 not found in backup database.")
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
