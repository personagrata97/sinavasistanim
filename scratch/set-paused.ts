import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient({ datasources: { db: { url: "file:/Users/selimkaya/.gemini/antigravity/scratch/spl-study-assistant/dev.db" } } })
async function run() {
  await prisma.course.updateMany({
    data: { status: "paused" }
  })
  console.log("All courses set to PAUSED. The UI will now show the 'Devam Et' button.")
}
run().then(() => prisma.$disconnect())
