import "dotenv/config"
import { prisma } from "../src/lib/prisma"
import { generateCourseNotes, verifyNotesAgainstSource } from "../src/lib/ai-service"

async function run() {
  console.log("🚀 [CHUNK GENERATION] Starting Section 1 micro-chunked notes generation...")

  // Fetch Course and Section 1
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
  if (!section) {
    console.error("Section 1 not found!")
    return
  }

  const raw = section.rawContent

  // 1. Dynamically parse official abbreviations from rawContent
  const lines = raw.split("\n")
  const parsedTerms: Array<{ key: string; rawLine: string }> = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.includes(":") && !trimmed.includes("http") && !trimmed.includes("file:/")) {
      const parts = trimmed.split(":")
      const rawKey = parts[0].trim()
      const rawDef = parts.slice(1).join(":").trim()
      
      if (
        rawKey.length > 0 && 
        rawKey.length < 25 && 
        rawDef.length > 0 && 
        !rawKey.match(/^\d/) && 
        !rawDef.includes("....")
      ) {
        let cleanKey = rawKey
        if (cleanKey.replace(/\s/g, "").length <= 8) {
          cleanKey = cleanKey.replace(/\s/g, "")
        }
        
        const isAcronym = /^[A-Z0-9a-z,\/.-]+$/.test(cleanKey) && cleanKey.length >= 2 && cleanKey !== "DersKodu" && cleanKey !== "Kapak"
        if (isAcronym) {
          parsedTerms.push({ key: cleanKey, rawLine: trimmed })
        }
      }
    }
  }

  parsedTerms.sort((a, b) => a.key.localeCompare(b.key))
  console.log(`Parsed and sorted ${parsedTerms.length} official abbreviations directly from rawContent.`)

  if (parsedTerms.length === 0) {
    console.error("No abbreviations could be parsed!")
    return
  }

  // 2. Divide into micro-batches of size 10 to ensure zero AI laziness and complete depth!
  const batchSize = 10
  const totalBatches = Math.ceil(parsedTerms.length / batchSize)
  console.log(`Dividing ${parsedTerms.length} terms into ${totalBatches} micro-batches of size ${batchSize}...`)

  const generatedBatches: string[] = []

  // Helper function with robust retry logic
  async function generateNotesWithRetry(content: string, title: string, courseName: string, userLevel: string, pageStart: number, pageEnd: number, retries = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await generateCourseNotes(content, title, courseName, userLevel, "law", undefined, pageStart, pageEnd);
        return res;
      } catch (err: any) {
        console.warn(`[RETRY] Batch generation failed (Attempt ${attempt}/${retries}): ${err.message}`);
        if (attempt === retries) throw err;
        console.log(`Waiting 60 seconds before retrying attempt ${attempt + 1}...`);
        await new Promise(r => setTimeout(r, 60000));
      }
    }
    throw new Error("Should not reach here");
  }

  for (let bIdx = 0; bIdx < totalBatches; bIdx++) {
    const start = bIdx * batchSize
    const end = Math.min(start + batchSize, parsedTerms.length)
    const batch = parsedTerms.slice(start, end)

    console.log(`\nGenerating Micro-Batch ${bIdx + 1}/${totalBatches} (${batch[0].key} to ${batch[batch.length - 1].key})...`)

    const batchTermsList = batch.map(t => `${t.key} : ${t.rawLine.split(":").slice(1).join(":").trim()}`).join("\n")
    const content = `BU AŞAMADA SADECE VE SADECE AŞAĞIDAKİ RESMİ LİSTEDE YER ALAN 10 ADET TERİMİ ELE AL, BAŞKA HİÇBİR TERİME GİRME:
${batchTermsList}

KAYNAK METİN:
${raw}`

    const notes = await generateNotesWithRetry(content, section.title, c.name, c.userLevel, section.pageStart, section.pageEnd)
    console.log(`Micro-Batch ${bIdx + 1} generated (${notes.length} chars)`)
    
    generatedBatches.push(notes)

    // Cooldown is NOT needed between every single call since we have 13 keys rotating automatically!
    // But we will add a 2-second breath delay to prevent concurrent request burst limits on Google's side.
    console.log("Waiting 2 seconds breath delay before the next batch...")
    await new Promise(r => setTimeout(r, 2000))
  }

  // 3. Concatenate and Clean all batches
  console.log("\nMerging and cleaning all micro-batches...")

  const cleanBatch = (n: string) => {
    return n
      .replace(/##\s*Kısaltmalar ve Terimler/gi, "")
      .replace(/##\s*📌\s*Kısaltmalar ve Terimler/gi, "")
      .replace(/###\s*🎯 Bu Bölüm Ne Anlatıyor\??[\s\S]*?(?=### 🔑)/gi, "")
      .trim()
  }

  const cleanedNotes = generatedBatches.map(cleanBatch).filter(Boolean).join("\n\n")

  // Construct the final beautiful unified study notes
  const mergedNotes = `## 📌 Kısaltmalar ve Terimler
 
### 🎯 Bu Bölüm Ne Anlatıyor?
Bu bölüm, Bilgi Sistemleri Güvenliği dersinde karşımıza çıkacak tüm kritik kısaltmalar, teknik terimler ve standartların yasal tanımlarını, İngilizce açılımlarını ve sınavda çıkabilecek önemli kavramları hafıza teknikleriyle bir arada sunan özel bir kılavuzdur.

${cleanedNotes}
`

  console.log(`Merged Notes size: ${mergedNotes.length} chars.`)

  // 4. Verify the merged notes
  console.log("\nVerifying final merged notes against source content...")
  let verificationScore = 0
  let missingTopics: string[] = []
  let issues: string[] = []
  let suggestions: string[] = []

  try {
    const verification = await verifyNotesAgainstSource(raw, mergedNotes, section.title, undefined, section.pageStart, section.pageEnd)
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

  // Overwrite database record with the REAL audited score
  console.log("\nUpdating database Section 1 notes and score...")
  await prisma.section.update({
    where: { id: section.id },
    data: {
      notes: mergedNotes,
      verificationScore: verificationScore,
      processed: true,
      verificationIssues: JSON.stringify({
        missingTopics,
        issues,
        suggestions,
        attemptHistory: [...prevHistory, newAttempt]
      })
    }
  })

  console.log(`🎉 [CHUNK GENERATION] Section 1 notes successfully generated and saved with real score: ${verificationScore}%`)
}

run().catch(console.error).finally(() => prisma.$disconnect())
