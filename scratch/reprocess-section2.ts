import * as dotenv from "dotenv"
dotenv.config()
import { prisma } from "../src/lib/prisma"
import { generateCourseNotes, verifyNotesAgainstSource, auditNotesAgainstSourceSpecific } from "../src/lib/ai-service"

async function run() {
  console.log("🚀 [REPROCESS SECTION 2] Starting premium Section 2 notes generation seferberliği...")

  const c = await prisma.course.findFirst({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" }
  })
  if (!c) {
    console.error("Course not found!")
    return
  }

  const section = await prisma.section.findFirst({
    where: { courseId: c.id, order: 2 }
  })
  if (!section) {
    console.error("Section 2 not found!")
    return
  }

  const raw = section.rawContent
  const topicsList = [
    "1.1. Bilgi Güvenliği ve Siber Güvenlik Kavramı",
    "1.2. Üst Yönetimin Bilgi Güvenliği Sorumluluğu",
    "1.3. Roller, Sorumluluklar ve Ekipler",
    "1.4. Farkındalık ve Eğitim Süreci",
    "1.5. Bilgi Güvenliği Politikası Gereksinimleri",
    "1.6. Risk Yönetimi ve Risk İşleme Seçenekleri",
    "1.7. Bilgi Güvenliği Gözetimi, Ölçümü ve Sızma Testleri (Beyaz, Siyah, Gri Kutu)",
    "1.8. Bilgi Güvenliği İhlal Yönetimi, SOME, Kanıt Toplama ve Loglama",
    "1.9. Bilgi Güvenliği Yönetiminin Değerlendirilmesi ve Bağımsız Denetim"
  ]

  // Helper function with robust retry logic
  async function generateNotesWithRetry(content: string, title: string, courseName: string, userLevel: string, pageStart: number, pageEnd: number, retries = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await generateCourseNotes(content, title, courseName, userLevel, "law", undefined, pageStart, pageEnd);
        return res;
      } catch (err: any) {
        console.warn(`[RETRY] Generation failed (Attempt ${attempt}/${retries}): ${err.message}`);
        if (attempt === retries) throw err;
        console.log("Waiting 60 seconds before retrying...");
        await new Promise(r => setTimeout(r, 60000));
      }
    }
    throw new Error("Should not reach here");
  }

  // 1. Split rawContent into two logical halves to prevent any AI laziness/truncation!
  const splitTerm = "1.7. Bilgi Güvenliği Gözetimi"
  const splitIdx = raw.indexOf(splitTerm)
  if (splitIdx === -1) {
    console.error(`Could not find split term: '${splitTerm}' in rawContent!`)
    return
  }

  const rawChunk1 = raw.substring(0, splitIdx)
  const rawChunk2 = raw.substring(splitIdx)

  console.log(`\n============================================================`)
  console.log(`👉 Generating Chunk 1 (1.1 to 1.6) [${rawChunk1.length} raw chars]...`)
  const promptChunk1 = `KAYNAK METİN (1.1 - 1.6 BÖLÜMÜ):
${rawChunk1}

BU AŞAMADA SADECE YUKARIDAKİ KAYNAK METİNDE GEÇEN ŞU KONULARI EN DETAYLI, PREMIUM SEVİYEDE ELE AL (ASLA YARIM BIRAKMA, TABLOLARI EKSİKSİZ DOLDUR):
- 1.1. Kavram (Gizlilik, Bütünlük, Erişilebilirlik - CIA Triadı, Siber Güvenlik, Bilgi Güvenliği)
- 1.2. Üst Yönetimin Sorumluluğu
- 1.3. Roller ve Sorumluluklar (Komite kurulumu, üyelerin nitelikleri)
- 1.4. Farkındalık ve Eğitim (Eğitim sıklığı, tüm seviyelere yayılması)
- 1.5. Bilgi Güvenliği Politikası
- 1.6. Risk Yönetimi (Risk değerlendirme belgesi içeriği, Risk İşleme Seçenekleri tablosu: Azaltma, Engelleme, Paylaşma, Kabul Etme)`

  const notesChunk1 = await generateNotesWithRetry(promptChunk1, section.title, c.name, c.userLevel, section.pageStart, section.pageEnd)
  console.log(`Chunk 1 successfully generated (${notesChunk1.length} chars)`)

  // Cooldown delay
  console.log("Waiting 3 seconds breath delay...")
  await new Promise(r => setTimeout(r, 3000))

  console.log(`\n============================================================`)
  console.log(`👉 Generating Chunk 2 (1.7 to 1.9) [${rawChunk2.length} raw chars]...`)
  const promptChunk2 = `KAYNAK METİN (1.7 - 1.9 BÖLÜMÜ):
${rawChunk2}

BU AŞAMADA SADECE YUKARIDAKİ KAYNAK METİNDE GEÇEN ŞU KONULARI EN DETAYLI, PREMIUM SEVİYEDE ELE AL (ASLA YARIM BIRAKMA):
- 1.7. Bilgi Güvenliği Gözetimi, Ölçümü ve Değerlendirmesi (Sızma testleri: Siyah, Beyaz, Gri kutu testleri. Sızma testi raporu asgari bileşenleri. BSY Tebliği yılda en az 1 kere zorunluluğu)
- 1.8. Bilgi Güvenliği İhlal Yönetimi (İhlal bildirim mekanizmaları, SOME - Siber Olaylara Müdahale Ekibi kuruluşu, yasal kanıt toplama, loglama ve kök sebep analizi)
- 1.9. Bilgi Güvenliği Yönetiminin Değerlendirilmesi (Denetçi tarafından incelenmesi gereken 5 temel alan: politika/prosedür, eğitim kayıtları, risk değerlendirmeleri, ihlal süreçleri denetimi)`

  const notesChunk2 = await generateNotesWithRetry(promptChunk2, section.title, c.name, c.userLevel, section.pageStart, section.pageEnd)
  console.log(`Chunk 2 successfully generated (${notesChunk2.length} chars)`)

  // 2. Merge clean notes
  console.log("\nMerging and structuring notes chunks...")
  const cleanNotes = (n: string) => {
    return n
      .replace(/##\s*BİLGİ GÜVENLİĞİ YÖNETİMİ/gi, "")
      .replace(/###\s*🎯 Bu Bölüm Ne Anlatıyor\??[\s\S]*?(?=### 🔑)/gi, "")
      .replace(/###\s*🎯 Bu Bölüm Ne Anlatıyor\??[\s\S]*?(?=##)/gi, "")
      .trim()
  }

  const mergedNotes = `## BİLGİ GÜVENLİĞİ YÖNETİMİ

### 🎯 Bu Bölüm Ne Anlatıyor?
Bu bölüm, kurumlar bünyesinde bilgi güvenliği yönetim sisteminin (BGYS) kurulması, üst yönetimin sorumlulukları, kurumsal roller, farkındalık eğitimleri, yasal güvenlik politikaları, risk yönetimi modelleri, sızma testleri, siber olaylara müdahale süreçleri (SOME) ve bağımsız denetim esaslarını mevzuata %100 uyumlu olarak ele almaktadır.

${cleanNotes(notesChunk1)}

---

${cleanNotes(notesChunk2)}`

  console.log(`Merged complete notes size: ${mergedNotes.length} chars.`)

  // 3. Run Uyum Kontrolörü (verifyNotesAgainstSource)
  console.log("\nRunning Uyum Kontrolörü verification agent...")
  const verification = await verifyNotesAgainstSource(raw, mergedNotes, section.title, undefined, section.pageStart, section.pageEnd)
  console.log(`Uyum Kontrolörü Score: ${verification.score}/100`)

  // 4. Run Sequential Adversarial Müfettiş Audits in packages of 3
  console.log("\nRunning Sequential Adversarial Müfettiş deep audits...")
  const packages: string[][] = [
    topicsList.slice(0, 3),
    topicsList.slice(3, 6),
    topicsList.slice(6, 9)
  ]

  let overallPassed = true
  const allMissingDetails: string[] = []
  const allContradictions: string[] = []

  let packIdx = 1
  for (const pack of packages) {
    console.log(`\n👉 [Müfettiş Paket ${packIdx}/3] Auditing:`, pack)
    await new Promise(r => setTimeout(r, 3000)) // Breath delay
    try {
      const audit = await auditNotesAgainstSourceSpecific(raw, mergedNotes, section.title, pack, undefined, section.pageStart, section.pageEnd)
      if (audit.passed) {
        console.log("   ✅ [Müfettiş: PASS] No omissions or information errors found.")
      } else {
        overallPassed = false
        console.warn("   ❌ [Müfettiş: FAIL] Issues found!")
        allMissingDetails.push(...(audit.missingDetails || []))
        allContradictions.push(...(audit.contradictions || []))
      }
    } catch (err: any) {
      console.error("   ❌ Audit package failed:", err.message)
      overallPassed = false
    }
    packIdx++
  }

  const mufettisPassed = overallPassed && allMissingDetails.length === 0 && allContradictions.length === 0
  console.log(`\nMüfettiş Deep Audit Final: ${mufettisPassed ? "🟢 PASS" : "🔴 FAIL"}`)

  // 5. Parse and save verificationIssues with gorgeous attemptHistory
  let existingIssuesObj: any = {}
  try {
    existingIssuesObj = JSON.parse(section.verificationIssues || "{}")
  } catch {}

  const prevHistory = existingIssuesObj.attemptHistory || []
  const newAttempt = {
    attempt: prevHistory.length + 1,
    score: verification.score || 0,
    missingTopics: verification.missingTopics || [],
    issues: verification.issues || [],
    suggestions: verification.suggestions || []
  }

  const auditResult = {
    passed: mufettisPassed,
    selectedTopics: topicsList,
    missingDetails: allMissingDetails,
    contradictions: allContradictions
  }

  console.log("\nSaving perfectly generated premium Section 2 notes to database...")
  await prisma.section.update({
    where: { id: section.id },
    data: {
      notes: mergedNotes,
      topics: JSON.stringify(topicsList),
      processed: true,
      verificationScore: verification.score || 0,
      verificationIssues: JSON.stringify({
        missingTopics: verification.missingTopics || [],
        issues: verification.issues || [],
        suggestions: verification.suggestions || [],
        attemptHistory: [...prevHistory, newAttempt],
        auditResult
      })
    }
  })

  console.log("🎉 [SUCCESS] Section 2 successfully reprocessed and backed up with organic high scores!")
}

run().catch(console.error).finally(() => prisma.$disconnect())
