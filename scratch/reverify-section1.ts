import * as dotenv from "dotenv"
dotenv.config()
import { prisma } from "../src/lib/prisma"
import { verifyNotesAgainstSource } from "../src/lib/ai-service"

async function run() {
  console.log("🚀 [REVERIFY] Re-running Auditor verification on the cleaned notes...")

  const c = await prisma.course.findFirst({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" }
  })
  if (!c) {
    console.error("Course not found!")
    return
  }

  const section = await prisma.section.findFirst({
    where: { courseId: c.id, order: 1 }
  })
  if (!section || !section.notes) {
    console.error("Section 1 notes not found!")
    return
  }

  try {
    const verification = await verifyNotesAgainstSource(
      section.rawContent, 
      section.notes, 
      section.title, 
      undefined, 
      section.pageStart, 
      section.pageEnd
    )
    console.log(`Final Verification Score from Auditor: ${verification.score}/100`)
    console.log(`Missing Topics count: ${verification.missingTopics?.length || 0}`)
    console.log(`Issues: ${JSON.stringify(verification.issues || [])}`)
    
    // Update database with the official verified score!
    await prisma.section.update({
      where: { id: section.id },
      data: {
        verificationScore: verification.score || 0,
        verificationIssues: JSON.stringify({
          missingTopics: verification.missingTopics || [],
          issues: verification.issues || [],
          suggestions: verification.suggestions || [],
          attemptHistory: [] // Reset clean
        })
      }
    })
    console.log(`🎉 [REVERIFY] Database successfully updated with score: ${verification.score}%`)
  } catch (err: any) {
    console.error("Re-verification failed:", err)
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
