import { prisma } from '../src/lib/prisma'

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" }
  })
  if (!course) {
    console.log("Course not found!")
    return
  }

  const deletedSections = await prisma.section.deleteMany({
    where: { courseId: course.id }
  })
  
  await prisma.flashcard.deleteMany({ where: { courseId: course.id } })
  await prisma.question.deleteMany({ where: { courseId: course.id } })
  await prisma.userMockExamResult.deleteMany({ where: { courseId: course.id } })

  await prisma.course.update({
    where: { id: course.id },
    data: {
      status: "pending",
      processedPages: 0
    }
  })

  console.log(`Course reset successfully! Deleted ${deletedSections.count} sections.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
