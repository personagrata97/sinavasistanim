import { prisma } from "../src/lib/prisma"

async function run() {
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      totalPages: true,
      processedPages: true,
      _count: {
        select: {
          sections: true,
          questions: true,
          flashcards: true
        }
      }
    }
  })

  console.log("=== COURSE GENERATION STATUS ===")
  if (courses.length === 0) {
    console.log("No courses found in database.")
    return
  }

  for (const c of courses) {
    console.log(`\nCourse: ${c.name} (${c.slug})`)
    console.log(`- Status: ${c.status}`)
    console.log(`- Pages: ${c.processedPages} / ${c.totalPages}`)
    console.log(`- Total Sections in DB: ${c._count.sections}`)
    console.log(`- Generated Flashcards: ${c._count.flashcards}`)
    console.log(`- Generated Questions: ${c._count.questions}`)

    // Count how many sections have generated notes
    const sections = await prisma.section.findMany({
      where: { courseId: c.id },
      select: {
        id: true,
        order: true,
        title: true,
        processed: true,
        notes: true,
        verificationScore: true
      }
    })

    const withNotes = sections.filter(s => s.notes && s.notes.trim().length > 0)
    const processed = sections.filter(s => s.processed)
    const highScores = sections.filter(s => s.verificationScore && s.verificationScore >= 95)

    console.log(`- Sections with notes: ${withNotes.length} / ${sections.length}`)
    console.log(`- Sections marked 'processed': ${processed.length} / ${sections.length}`)
    console.log(`- High Verification Score (>= 95%): ${highScores.length} / ${sections.length}`)
    
    if (sections.length > 0) {
      const avgScore = sections.reduce((acc, s) => acc + (s.verificationScore || 0), 0) / sections.length
      console.log(`- Average Verification Score: %${avgScore.toFixed(2)}`)
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
