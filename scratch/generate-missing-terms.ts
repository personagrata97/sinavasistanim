import * as dotenv from "dotenv"
dotenv.config()
import { prisma } from "../src/lib/prisma"
import { generateCourseNotes, verifyNotesAgainstSource } from "../src/lib/ai-service"

async function run() {
  console.log("🚀 [MISSING TERMS] Starting generation of the 5 missing premium terms...")

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

  // 1. Generate the 5 missing terms combined in a single high-quality call
  const content = `BU AŞAMADA SADECE VE SADECE AŞAĞIDAKİ RESMİ LİSTEDE YER ALAN 5 ADET TERİMİ ELE AL, BAŞKA HİÇBİR TERİME GİRME:
BSBD Tebliği : III - 62.2 sayılı Bilgi Sistemleri Bağımsız Denetim Tebliği
BSY Tebliği : VII - 128.10 sayılı Bilgi Sistemleri Yönetimine İlişkin Usul ve Esaslar Tebliği
MAC Adresi : Media Access Control Address ( Ortam Erişim Kontrolü Adresi )
SPKn, Kanun : Sermaye Piyasası Kanunu
SPK, Kurul : Sermaye Piyasası Kurulu`

  console.log("Calling AI engine to generate premium definitions for the 5 missing terms...")
  const rawNotes = await generateCourseNotes(content, "Kısaltmalar ve Terimler", c.name, c.userLevel, "law")
  console.log("Successfully generated raw notes for the 5 terms!")

  // 2. Parse the generated 5 terms
  const generatedParts = rawNotes.split("### 🔑")
  const missingTermsMap = new Map<string, string>()

  for (let i = 1; i < generatedParts.length; i++) {
    const block = generatedParts[i]
    const lines = block.split("\n")
    const termHeader = lines[0].trim()
    
    if (
      termHeader.toLowerCase().includes("özet") || 
      termHeader.toLowerCase().includes("summary") || 
      termHeader === ""
    ) {
      continue
    }

    const splitHeaders = ["### 🪤", "### Bölüm Özeti", "### 🔑 Bölüm Özeti", "### 🧪", "## 📌"]
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
      missingTermsMap.set(termHeader, finalBlock)
    }
  }

  console.log(`Parsed ${missingTermsMap.size} missing terms from the AI output:`, Array.from(missingTermsMap.keys()))

  // 3. Load existing terms from Section 1 notes
  const existingNotes = section.notes
  const existingParts = existingNotes.split("### 🔑")
  const header = existingParts[0].trim()
  
  const allTermsMap = new Map<string, string>()

  // Load existing unique terms
  for (let i = 1; i < existingParts.length; i++) {
    const block = existingParts[i]
    const lines = block.split("\n")
    const termHeader = lines[0].trim()
    
    if (
      termHeader.toLowerCase().includes("özet") || 
      termHeader.toLowerCase().includes("summary") || 
      termHeader === ""
    ) {
      continue
    }

    const splitHeaders = ["### 🪤", "### Bölüm Özeti", "### 🔑 Bölüm Özeti", "### 🧪", "## 📌"]
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
      allTermsMap.set(termHeader, finalBlock)
    }
  }

  // Merge the new 5 terms
  for (const [key, value] of missingTermsMap.entries()) {
    allTermsMap.set(key, value)
  }

  // Sort terms alphabetically
  const sortedKeys = Array.from(allTermsMap.keys()).sort((a, b) => a.localeCompare(b))
  const cleanedTerms = sortedKeys.map(k => `### 🔑 ${allTermsMap.get(k)}`)

  console.log(`Merged complete dictionary. Total unique terms: ${cleanedTerms.length}`)

  // Re-construct the beautiful unified clean study notes
  const mergedNotes = `${header}\n\n${cleanedTerms.join("\n\n---\n\n")}\n`

  // Run Auditor verification on the newly merged complete notes
  console.log("\nVerifying the complete merged notes with Auditor...")
  const verification = await verifyNotesAgainstSource(
    section.rawContent, 
    mergedNotes, 
    section.title, 
    undefined, 
    section.pageStart, 
    section.pageEnd
  )
  
  console.log(`Final Verification Score from Auditor: ${verification.score}/100`)
  console.log(`Missing Topics: ${JSON.stringify(verification.missingTopics || [])}`)
  console.log(`Issues: ${JSON.stringify(verification.issues || [])}`)

  // Save the complete notes to the database
  await prisma.section.update({
    where: { id: section.id },
    data: {
      notes: mergedNotes,
      verificationScore: verification.score || 0,
      verificationIssues: JSON.stringify({
        missingTopics: verification.missingTopics || [],
        issues: verification.issues || [],
        suggestions: verification.suggestions || [],
        attemptHistory: []
      })
    }
  })

  console.log(`🎉 [MISSING TERMS] Section 1 notes successfully updated and saved with organic score: ${verification.score}%`)
}

run().catch(console.error).finally(() => prisma.$disconnect())
