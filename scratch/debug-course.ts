import { prisma } from "../src/lib/prisma"

async function run() {
  const course = await prisma.course.findFirst({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" }
  })
  console.log("=== COURSE DETAILS ===")
  console.log(JSON.stringify(course, null, 2))
}

run().catch(console.error).finally(() => prisma.$disconnect())
