import { prisma } from "../src/lib/prisma"

async function run() {
  const c = await prisma.course.findFirst({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" }
  })

  if (!c) {
    console.error("Course not found!")
    return
  }

  const s = await prisma.section.findFirst({
    where: { courseId: c.id, order: 1 }
  })

  if (!s) {
    console.error("Section 1 not found!")
    return
  }

  console.log("=== SECTION 1 DETAILS ===")
  console.log(`Title: ${s.title}`)
  console.log(`Order: ${s.order}`)
  console.log(`Processed: ${s.processed}`)
  console.log(`Verification Score: ${s.verificationScore}`)
  console.log(`Notes Char Count: ${s.notes ? s.notes.length : 0}`)
  console.log(`Verification Issues: ${s.verificationIssues}`)
}

run().catch(console.error).finally(() => prisma.$disconnect())
