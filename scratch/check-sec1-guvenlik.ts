import { prisma } from "../src/lib/prisma"

async function run() {
  const s = await prisma.section.findFirst({
    where: { 
      course: { slug: "bd-bilgi-sistemleri-guvenligi" },
      order: 1
    }
  })

  if (!s) {
    console.log("Section not found!")
    return
  }

  console.log("=== SECTION 1 VERIFICATION ISSUES ===")
  console.log(s.verificationIssues)
}

run().catch(console.error).finally(() => prisma.$disconnect())
