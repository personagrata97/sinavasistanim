import { prisma } from "../src/lib/prisma"
import { initializeCourses } from "../src/lib/actions"

async function run() {
  console.log("🚀 [RESTORE & CLEAN] Starting restoration of all course names...")

  // 1. Call initializeCourses to re-populate all courses and their metadata in the DB
  console.log("  -> Re-initializing all program and course metadata in the database...")
  await initializeCourses()
  console.log("  -> Metadata successfully re-initialized!")

  // 2. Clear AI notes, questions, and flashcards for other courses
  const otherCourses = await prisma.course.findMany({
    where: {
      slug: {
        not: "bd-bilgi-sistemleri-guvenligi"
      }
    }
  })

  console.log(`  -> Cleaning AI data for ${otherCourses.length} other courses...`)

  for (const c of otherCourses) {
    // Reset course status to "not_started"
    await prisma.course.update({
      where: { id: c.id },
      data: {
        status: "not_started",
        processedPages: 0
      }
    })

    // Fetch and reset all sections
    const sections = await prisma.section.findMany({
      where: { courseId: c.id }
    })

    for (const sec of sections) {
      await prisma.section.update({
        where: { id: sec.id },
        data: {
          notes: null,
          summary: null,
          importance: null,
          topics: null,
          verificationScore: null,
          verificationIssues: null,
          processed: false
        }
      })
    }

    // Delete related generated items
    await prisma.flashcard.deleteMany({ where: { courseId: c.id } })
    await prisma.question.deleteMany({ where: { courseId: c.id } })

    console.log(`  ✅ Cleaned generated notes/questions/flashcards for: ${c.name} (${c.slug})`)
  }

  console.log("\n🎉 [RESTORE & CLEAN] All other course names restored and blanked successfully!")
}

run().catch(console.error).finally(() => prisma.$disconnect())
