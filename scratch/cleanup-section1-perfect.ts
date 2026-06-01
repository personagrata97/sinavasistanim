import * as dotenv from "dotenv"
dotenv.config()
import { prisma } from "../src/lib/prisma"
import { verifyNotesAgainstSource } from "../src/lib/ai-service"

async function run() {
  console.log("🧹 [PERFECT CLEANUP] Starting final perfect cleanup of Section 1 notes...")

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
  const parts = notes.split("### 🔑")
  const header = parts[0].trim()
  
  const uniqueTerms = new Map<string, string>()

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i]
    const lines = block.split("\n")
    const termHeader = lines[0].trim()
    
    // Discard summary blocks and any empty blocks
    if (
      termHeader.toLowerCase().includes("özet") || 
      termHeader.toLowerCase().includes("summary") || 
      termHeader === ""
    ) {
      continue
    }

    // Clean block from trailing separators or general section indicators
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
    
    let blockLines = cleanBlock.trim().split("\n")
    if (blockLines[blockLines.length - 1].trim() === "---") {
      blockLines = blockLines.slice(0, -1)
    }
    
    const finalBlock = blockLines.join("\n").trim()
    if (finalBlock) {
      // If we already have this term, keep the longer/more complete one
      const existing = uniqueTerms.get(termHeader)
      if (!existing || finalBlock.length > existing.length) {
        uniqueTerms.set(termHeader, finalBlock)
      }
    }
  }

  // Sort terms alphabetically
  const sortedKeys = Array.from(uniqueTerms.keys()).sort((a, b) => a.localeCompare(b))
  const cleanedTerms = sortedKeys.map(k => `### 🔑 ${uniqueTerms.get(k)}`)

  console.log(`Preserved ${cleanedTerms.length} unique and perfectly clean term blocks.`)

  // Re-construct the beautiful unified clean study notes
  const mergedNotes = `${header}\n\n${cleanedTerms.join("\n\n---\n\n")}\n`

  console.log(`Merged Perfect Notes size: ${mergedNotes.length} chars.`)

  // Run Auditor verification on the perfectly cleaned notes
  console.log("\nVerifying cleaned merged notes against source content...")
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

  // Overwrite database record with the REAL audited score
  await prisma.section.update({
    where: { id: section.id },
    data: {
      notes: mergedNotes,
      verificationScore: verification.score || 0,
      verificationIssues: JSON.stringify({
        missingTopics: verification.missingTopics || [],
        issues: verification.issues || [],
        suggestions: verification.suggestions || [],
        attemptHistory: [] // Reset history clean
      })
    }
  })

  console.log(`🎉 [CLEANUP] Section 1 notes successfully cleaned and saved with organic score: ${verification.score}%`)
}

run().catch(console.error).finally(() => prisma.$disconnect())
