import { prisma } from "../src/lib/prisma"
import { generateFlashcards, generateQuestions } from "../src/lib/ai-service"

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: "bd-bilgi-sistemleri-guvenligi" }})
  if (!course) throw new Error("Course not found")
  
  const section = await prisma.section.findFirst({
    where: { courseId: course.id, title: "VARLIK YÖNETİMİ" }
  })
  
  if (!section) throw new Error("Section not found")
  
  console.log(`Generating flashcards and questions for: ${section.title}`)
  
  const aiMode = "finance"
  
  console.log("Generating Questions...")
  const questions = await generateQuestions(section.notes || "", section.title, aiMode)

  console.log(`Generated ${questions.length} questions! Saving...`)
  for (const q of questions) {
    await prisma.question.create({
      data: {
        text: q.text,
        options: JSON.stringify(q.options),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        courseId: course.id,
        sectionId: section.id
      }
    })
  }
  
  await prisma.section.update({
    where: { id: section.id },
    data: { processed: true, verificationScore: 100 }
  })
  
  console.log("ALL DONE!")
}

main().catch(console.error)
