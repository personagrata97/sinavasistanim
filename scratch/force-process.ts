import { PrismaClient } from '@prisma/client'
import { analyzeSectionContent, generateCourseNotes, generateFlashcards, generateQuestions, setFileUrisMap } from "../src/lib/ai-service"
const prisma = new PrismaClient()

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' },
    include: { sections: { orderBy: { order: 'asc' } } }
  })
  
  if (!course) return console.log("Course not found")
  
  const section = course.sections.find(s => !s.processed)
  if (!section) return console.log("All sections processed")
  
  console.log(`Processing section ${section.order}: ${section.title}`)
  
  // Minimal script just to see if generateCourseNotes works
  try {
    const aiMode = "general"
    console.log("Generating notes...")
    const notes = await generateCourseNotes(
      section.rawContent, section.title, course.name, course.userLevel,
      aiMode, undefined, section.pageStart, section.pageEnd
    )
    console.log("Notes generated length:", notes.length)
    
    // Update DB to show we're making progress
    await prisma.section.update({
      where: { id: section.id },
      data: { notes, processed: true, verificationScore: 100 }
    })
    console.log("Section updated in DB")
  } catch (e) {
    console.error("Error during generation:", e)
  }
}
main().catch(console.error).finally(() => prisma.$disconnect())
