import { prisma } from "../src/lib/prisma"

async function run() {
  console.log("🚀 [DATABASE MAINTENANCE] Resetting Sections 2 and 3 to force clean premium regeneration from scratch...")

  const course = await prisma.course.findUnique({
    where: { slug: "masak-uyum-gorevlisi" }
  })

  if (!course) {
    console.error("❌ Course 'masak-uyum-gorevlisi' not found!")
    return
  }

  // Reset Section 2 and Section 3
  const result = await prisma.section.updateMany({
    where: {
      courseId: course.id,
      order: { in: [2, 3] }
    },
    data: {
      notes: null,
      verificationScore: 0,
      processed: false,
      verificationIssues: null
    }
  })

  console.log(`✅ Successfully reset ${result.count} sections (Sections 2 and 3) in the database!`)
  console.log("Section 1 remains fully preserved in its 100% premium state.")
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
