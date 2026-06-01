import { prisma } from "../src/lib/prisma"
import * as fs from "fs"
import * as path from "path"

async function run() {
  const s = await prisma.section.findFirst({
    where: { 
      course: { slug: "bd-bilgi-sistemleri-guvenligi" },
      order: 1
    }
  })

  if (!s || !s.notes) {
    console.log("Section not found!")
    return
  }

  const outPath = path.resolve(process.cwd(), "scratch/sec1_preview.txt")
  fs.writeFileSync(outPath, s.notes)
  console.log("Wrote section 1 notes to " + outPath)
}

run().catch(console.error).finally(() => prisma.$disconnect())
