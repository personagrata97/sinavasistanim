import { prisma } from "../src/lib/prisma"

async function run() {
  console.log("🚀 [DATABASE MAINTENANCE] Resetting target sections to force regeneration under the premium algorithm...")

  const course = await prisma.course.findUnique({
    where: { slug: "masak-uyum-gorevlisi" }
  })

  if (!course) {
    console.error("❌ Course 'masak-uyum-gorevlisi' not found!")
    return
  }

  // Reset sections with order >= 4
  const result = await prisma.section.updateMany({
    where: {
      courseId: course.id,
      order: { gte: 4 }
    },
    data: {
      notes: null,
      verificationScore: 0,
      processed: false,
      verificationIssues: null
    }
  })

  console.log(`✅ Successfully reset ${result.count} sections (Sections 4 through 18) to force premium regeneration from scratch!`)
  console.log("Sections 1, 2, and 3 are preserved in their new premium algorithm state.")
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
