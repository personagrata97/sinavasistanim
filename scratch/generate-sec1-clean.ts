import "dotenv/config"
import { prisma } from "../src/lib/prisma"
import { generateCourseNotes, verifyNotesAgainstSource, generateFlashcards, generateQuestions } from "../src/lib/ai-service"

async function run() {
  console.log("🚀 Running clean Section 1 notes generation without diagrams/tables...")

  const course = await prisma.course.findFirst({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" },
    include: { program: true }
  })

  if (!course) {
    console.error("Course not found!")
    return
  }

  // Set file URIs map to enable correct key rotation mappings and avoid 403 errors
  let uriMap: Record<string, string> = {}
  if (course.geminiFileUris) {
    try {
      uriMap = JSON.parse(course.geminiFileUris)
    } catch {}
  }
  const { setFileUrisMap } = require("../src/lib/ai-service")
  setFileUrisMap(uriMap)

  const sec = await prisma.section.findFirst({
    where: { courseId: course.id, order: 1 }
  })

  if (!sec) {
    console.error("Section 1 not found!")
    return
  }

  console.log(`🔷 Found Section: "${sec.title}"`)
  console.log("   Step 1: Cleaning previous Section 1 notes/questions/flashcards to start absolutely fresh...")
  
  await prisma.section.update({
    where: { id: sec.id },
    data: {
      notes: null,
      verificationScore: 0,
      processed: false,
      verificationIssues: null
    }
  })

  await prisma.question.deleteMany({ where: { sectionId: sec.id } })
  await prisma.flashcard.deleteMany({ where: { sectionId: sec.id } })

  console.log("   Step 2: Requesting fresh AI draft (Zero Mermaid / Zero Tables)...")
  const aiMode = course.program?.aiMode || "general"
  const activeFileUri = uriMap["0"] || undefined

  const notes = await generateCourseNotes(
    sec.rawContent,
    sec.title,
    course.name,
    course.userLevel,
    aiMode,
    activeFileUri,
    sec.pageStart,
    sec.pageEnd
  )

  console.log(`   ✅ AI generated notes successfully (${notes.length} chars).`)

  console.log("   Step 3: Verifying fresh notes against source...")
  const verification = await verifyNotesAgainstSource(
    sec.rawContent,
    notes,
    sec.title,
    undefined,
    sec.pageStart,
    sec.pageEnd
  )

  console.log(`   Verification Score: ${verification.score}%`)

  await prisma.section.update({
    where: { id: sec.id },
    data: {
      notes,
      verificationScore: verification.score,
      verificationIssues: JSON.stringify({
        missingDetails: verification.missingTopics || [],
        contradictions: verification.issues || [],
        suggestions: verification.suggestions || []
      }),
      processed: true
    }
  })

  console.log("   Step 4: Generating clean flashcards...")
  const fullContent = `${sec.rawContent}\n\n--- DERS NOTLARI (PDF görselleri dahil) ---\n${notes}`
  const flashcards = await generateFlashcards(
    fullContent, sec.title, course.name, course.userLevel,
    aiMode, undefined, sec.pageStart, sec.pageEnd
  )
  console.log(`   AI generated ${flashcards.length} flashcards. Saving to DB...`)
  for (const card of flashcards) {
    await prisma.flashcard.create({
      data: {
        courseId: course.id,
        sectionId: sec.id,
        front: card.front,
        back: card.back,
        difficulty: card.difficulty || "medium"
      }
    })
  }

  console.log("   Step 5: Generating clean questions...")
  const questions = await generateQuestions(
    fullContent, sec.title, course.name, course.userLevel,
    aiMode, undefined, sec.pageStart, sec.pageEnd
  )
  console.log(`   AI generated ${questions.length} questions. Saving to DB...`)
  for (const q of questions) {
    await prisma.question.create({
      data: {
        courseId: course.id,
        sectionId: sec.id,
        text: q.text,
        options: JSON.stringify(q.options),
        correct: q.correct,
        explanation: q.explanation,
        difficulty: q.difficulty || "medium",
        module: sec.module
      }
    })
  }

  console.log("🎉 Clean Section 1 generation completed successfully!")
}

run().catch(console.error).finally(() => prisma.$disconnect())
