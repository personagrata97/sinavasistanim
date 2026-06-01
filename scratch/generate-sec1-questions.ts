import "dotenv/config"
import { prisma } from "../src/lib/prisma"
import { generateQuestions } from "../src/lib/ai-service"

async function run() {
  console.log("🚀 Running clean Section 1 questions-only generation...")

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

  if (!sec.notes) {
    console.error("Section 1 notes not found! Please run notes generation first.")
    return
  }

  console.log(`🔷 Found Section: "${sec.title}"`)
  console.log("   Cleaning existing questions for Section 1 to prevent duplicates...")
  await prisma.question.deleteMany({ where: { sectionId: sec.id } })

  console.log("   Step 5: Generating clean questions using the newly optimized 10-15 count rule...")
  const aiMode = course.program?.aiMode || "general"
  const fullContent = `${sec.rawContent}\n\n--- DERS NOTLARI (PDF görselleri dahil) ---\n${sec.notes}`
  const questions = await generateQuestions(
    fullContent, sec.title, course.name, course.userLevel,
    aiMode, undefined, sec.pageStart, sec.pageEnd, sec.importance || undefined
  )
  console.log(`   ✅ AI generated ${questions.length} questions successfully. Saving to DB...`)
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

  console.log("🎉 Clean Section 1 questions-only generation completed successfully!")
}

run().catch(console.error).finally(() => prisma.$disconnect())
