import { prisma } from "../src/lib/prisma"
import { verifyNotesAgainstSource } from "../src/lib/ai-service"

async function run() {
  console.log("🧹 [CLEANUP] Starting cleanup of Section 1 notes...")

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

  const notes = section.notes

  // Split by acronym key pattern: "### 🔑"
  const parts = notes.split("### 🔑")
  if (parts.length <= 1) {
    console.log("No acronym parts found in notes!")
    return
  }

  const header = parts[0].trim()
  const cleanedTerms: string[] = []

  console.log(`Analyzing ${parts.length - 1} generated term blocks...`)

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i]
    
    // For each acronym block, we want to discard everything that appears after the micro-scenario
    // This includes any appended general sections like "Sınav Tuzakları", "Bölüm Özeti", "Kendini Test Et!"
    // The acronym block ends when any of these generic sections or a separator is hit.
    const splitHeaders = [
      "### 🪤", 
      "### Bölüm Özeti", 
      "### 🔑 Bölüm Özeti", 
      "### 🧪", 
      "## 📌", 
      "## Kısaltmalar"
    ]
    
    let cleanBlock = block
    for (const sh of splitHeaders) {
      if (cleanBlock.includes(sh)) {
        cleanBlock = cleanBlock.split(sh)[0]
      }
    }
    
    // Trim and clean trailing separators or lines
    let blockLines = cleanBlock.trim().split("\n")
    if (blockLines[blockLines.length - 1].trim() === "---") {
      blockLines = blockLines.slice(0, -1)
    }
    
    const finalBlock = blockLines.join("\n").trim()
    if (finalBlock) {
      cleanedTerms.push(`### 🔑 ${finalBlock}`)
    }
  }

  console.log(`Cleaned and preserved ${cleanedTerms.length} term blocks.`)

  // Re-construct the beautiful unified clean study notes
  const mergedNotes = `${header}\n\n${cleanedTerms.join("\n\n---\n\n")}\n`

  console.log(`Merged Clean Notes size: ${mergedNotes.length} chars.`)

  // Run Auditor verification on the newly cleaned notes
  console.log("\nVerifying cleaned merged notes against source content...")
  let verificationScore = 0
  let missingTopics: string[] = []
  let issues: string[] = []
  let suggestions: string[] = []

  try {
    const verification = await verifyNotesAgainstSource(
      section.rawContent, 
      mergedNotes, 
      section.title, 
      undefined, 
      section.pageStart, 
      section.pageEnd
    )
    console.log(`Final Verification Score from Auditor: ${verification.score}/100`)
    console.log(`Missing Topics count: ${verification.missingTopics?.length || 0}`)
    console.log(`Issues: ${JSON.stringify(verification.issues || [])}`)
    
    verificationScore = verification.score || 0
    missingTopics = verification.missingTopics || []
    issues = verification.issues || []
    suggestions = verification.suggestions || []
  } catch (err: any) {
    console.error("Auditor verification agent failed:", err)
  }

  // Parse existing verificationIssues to preserve attempt history
  let existingIssuesObj: any = {}
  try {
    existingIssuesObj = JSON.parse(section.verificationIssues || "{}")
  } catch {}

  const prevHistory = existingIssuesObj.attemptHistory || []
  const newAttempt = {
    attempt: prevHistory.length + 1,
    score: verificationScore,
    missingTopics,
    issues,
    suggestions
  }

  // Save the clean notes to the database
  console.log("\nUpdating database Section 1 notes with cleaned version...")
  await prisma.section.update({
    where: { id: section.id },
    data: {
      notes: mergedNotes,
      verificationScore: verificationScore,
      verificationIssues: JSON.stringify({
        missingTopics,
        issues,
        suggestions,
        attemptHistory: [...prevHistory, newAttempt]
      })
    }
  })

  console.log(`🎉 [CLEANUP] Section 1 notes successfully cleaned and saved with real score: ${verificationScore}%`)
}

run().catch(console.error).finally(() => prisma.$disconnect())
