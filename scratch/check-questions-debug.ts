import { prisma } from "../src/lib/prisma"

async function run() {
  console.log("=== DEBUGGING QUESTIONS ===")
  const course = await prisma.course.findUnique({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" }
  })
  if (!course) {
    console.log("Course not found!")
    return
  }

  const questions = await prisma.question.findMany({
    where: { courseId: course.id },
    include: { section: true }
  })

  console.log(`Total questions for course ${course.id}: ${questions.length}`)
  questions.forEach((q, i) => {
    console.log(`Question ${i + 1}:`)
    console.log(`  ID: ${q.id}`)
    console.log(`  Text: ${q.text}`)
    console.log(`  SectionID: ${q.sectionId}`)
    console.log(`  Section Title: ${q.section ? q.section.title : "NONE"}`)
  })
}

run().catch(console.error).finally(() => prisma.$disconnect())
