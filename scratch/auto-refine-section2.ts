import * as dotenv from "dotenv"
dotenv.config()
import { prisma } from "../src/lib/prisma"
import { generateCourseNotes, verifyNotesAgainstSource, auditNotesAgainstSourceSpecific } from "../src/lib/ai-service"
import { execSync } from "child_process"

async function run() {
  console.log("🚀 [AUTO-REFINE SECTION 2] Organik 100/100 ve Çift Onay Seferberliği Başlatıldı...")

  const course = await prisma.course.findFirst({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" }
  })
  if (!course) {
    console.error("Course not found!")
    return
  }

  const section = await prisma.section.findFirst({
    where: { courseId: course.id, order: 2 }
  })
  if (!section) {
    console.error("Section 2 not found!")
    return
  }

  const rawContent = section.rawContent
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

  const maxAttempts = 10
  let currentNotes = section.notes || ""
  let currentScore = section.verificationScore || 0

  // Parse existing issues
  let issuesObj: any = {}
  try {
    issuesObj = JSON.parse(section.verificationIssues || "{}")
  } catch {}

  let attemptHistory = issuesObj.attemptHistory || []

  // Helper function with robust retry logic
  async function generateNotesWithRetry(content: string, title: string, courseName: string, userLevel: string, pageStart: number, pageEnd: number, retries = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await generateCourseNotes(content, title, courseName, userLevel, "law", undefined, pageStart, pageEnd);
        return res;
      } catch (err: any) {
        console.warn(`[RETRY] Generation failed (Attempt ${attempt}/${retries}): ${err.message}`);
        if (attempt === retries) throw err;
        console.log("Waiting 30 seconds before retrying...");
        await new Promise(r => setTimeout(r, 30000));
      }
    }
    throw new Error("Should not reach here");
  }

  for (let round = 1; round <= maxAttempts; round++) {
    console.log(`\n============================================================`)
    console.log(`🔄 [ROUND ${round}/${maxAttempts}] Mevcut Puan: %${currentScore}`)
    console.log(`============================================================`)

    // Get current section state freshly from DB to avoid race conditions
    const freshSection = await prisma.section.findUnique({ where: { id: section.id } })
    if (!freshSection) {
      console.error("Section fresh check failed!")
      return
    }

    let freshIssues: any = {}
    try {
      freshIssues = JSON.parse(freshSection.verificationIssues || "{}")
    } catch {}

    const missingTopics = freshIssues.missingTopics || []
    const validationIssues = freshIssues.issues || []
    const suggestions = freshIssues.suggestions || []
    const auditResult = freshIssues.auditResult || {}
    const missingDetails = auditResult.missingDetails || []
    const contradictions = auditResult.contradictions || []

    const mufettisPassed = auditResult.passed === true || (missingDetails.length === 0 && contradictions.length === 0)
    const isPerfect = freshSection.verificationScore === 100

    if (isPerfect && mufettisPassed) {
      console.log(`\n🎉 [CONGRATS] Ders notu zaten %100 Organik Tam Puan ve Çift Onaylı! Döngüye gerek kalmadı.`)
      break
    }

    // Gather all target exclusions/issues
    const allIssues = [
      ...missingTopics.map((t: string) => `Eksik Konu (Kontrolör): ${t}`),
      ...validationIssues.map((i: string) => `Bilgi Hatası/Uyumsuzluk (Kontrolör): ${i}`),
      ...suggestions.map((s: string) => `İyileştirme Önerisi (Kontrolör): ${s}`),
      ...missingDetails.map((d: string) => `Kılcal Detay Eksiği (Müfettiş): ${d}`),
      ...contradictions.map((c: string) => `Bilgi Uyuşmazlığı (Müfettiş): ${c}`)
    ]

    if (allIssues.length === 0 && isPerfect) {
      console.log(`\n🎉 [CONGRATS] Sıfır Eksik ve %100 Puan yakalandı! Döngü tamamlanıyor...`)
      break
    }

    console.log(`\n🔍 Tespit Edilen Eksiklik/Geliştirme Sayısı: ${allIssues.length}`)
    console.log(allIssues.map(x => `- ${x}`).join("\n"))

    // Construct Enrichment Prompt
    const missingList = allIssues.join("\n- ")
    const enrichedContent = `⚠️⚠️⚠️ [KRİTİK HEDEF - KESİNTİSİZ PREMIUM ENTEGRASYON]:
Aşağıda listelenen tüm Kontrolör ve Müfettiş eksiklerini, bir önceki adımda üretilmiş olan ders notlarının (PREVIOUS STUDY NOTES) uygun bölümlerine doğal bir akışla yerleştirerek notu zenginleştir.

🔍 GİDERİLECEK EKSİK / DÜZELTİLECEK BULGU LİSTESİ:
- ${missingList}

🚫🚫🚫 AŞIRI HASSAS KANUN (HATA TOLERANSI SIFIR):
1. Sana aşağıda verilen [PREVIOUS STUDY NOTES] içindeki hiçbir başlığı, tabloyu, formülü, mikro-senaryoyu, benzetmeyi veya yasal açıklamayı KESİNLİKLE SİLME, DEĞİŞTİRME veya KISALTMA!
2. Notları tamamen baştan yazma. Mevcut tüm notları (paragraf paragraf, harfi harfine) olduğu gibi koru ve yeni ekleyeceğin yasal/teknik eksikleri bu paragrafların içine pürüzsüzce yerleştir.
3. Çıktının uzunluğu, bir önceki nottan [PREVIOUS STUDY NOTES] kesinlikle DAHA UZUN olmalıdır (en az 8.500 karakter civarında dolgun bir bütün olmalıdır). Notu kısaltmak, özetlemek veya sadece yeni eklenen eksikleri yazıp bitirmek KESİNLİKLE YASAKTIR ve ağır bir başarısızlık sebebidir!
4. Üreteceğin sonuç, eski notların tümünü eksiksiz barındıran ve yeni eklerle zenginleştirilmiş tek bir devasa "Premium Ders Notu" bütünü olmalıdır.

---

[PREVIOUS STUDY NOTES]
${freshSection.notes || ""}

---

[RAW SOURCE CONTENT]
${freshSection.rawContent}`

    console.log(`\n🧠 Zenginleştirilmiş ders notları üretiliyor (Round ${round})...`)
    const refinedNotes = await generateNotesWithRetry(
      enrichedContent,
      freshSection.title,
      course.name,
      course.userLevel,
      freshSection.pageStart,
      freshSection.pageEnd
    )

    console.log(`Refined notes generated (${refinedNotes.length} chars).`)

    // Verify notes (Uyum Kontrolörü)
    console.log("\nRunning Uyum Kontrolörü verification...")
    const verification = await verifyNotesAgainstSource(
      freshSection.rawContent,
      refinedNotes,
      freshSection.title,
      undefined,
      freshSection.pageStart,
      freshSection.pageEnd
    )
    console.log(`Uyum Kontrolörü Score: ${verification.score}/100`)

    // Run Sequential Adversarial Müfettiş Audits
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
      console.log(`   👉 [Müfettiş Paket ${packIdx}/3] Auditing...`)
      await new Promise(r => setTimeout(r, 2000))
      try {
        const audit = await auditNotesAgainstSourceSpecific(rawContent, refinedNotes, freshSection.title, pack, undefined, freshSection.pageStart, freshSection.pageEnd)
        if (audit.passed) {
          console.log(`      ✅ [Müfettiş: PASS] Paket ${packIdx} temiz.`)
        } else {
          overallPassed = false
          console.warn(`      ❌ [Müfettiş: FAIL] Paket ${packIdx} sorunlu.`)
          allMissingDetails.push(...(audit.missingDetails || []))
          allContradictions.push(...(audit.contradictions || []))
        }
      } catch (err: any) {
        console.error(`      ❌ Audit package failed:`, err.message)
        overallPassed = false
      }
      packIdx++
    }

    const finalMufettisPassed = overallPassed && allMissingDetails.length === 0 && allContradictions.length === 0
    console.log(`\nMüfettiş Deep Audit Round ${round} Final: ${finalMufettisPassed ? "🟢 PASS" : "🔴 FAIL"}`)

    // Update history
    const nextAttemptNum = attemptHistory.filter((h: any) => h.attempt > 0).length + 1
    attemptHistory.push({
      attempt: nextAttemptNum,
      score: verification.score || 0,
      missingTopics: verification.missingTopics || [],
      issues: verification.issues || [],
      suggestions: verification.suggestions || []
    })

    const finalAuditResult = {
      passed: finalMufettisPassed,
      selectedTopics: topicsList,
      missingDetails: allMissingDetails,
      contradictions: allContradictions
    }

    // Save to DB fresh
    console.log("Saving Round results to database...")
    await prisma.section.update({
      where: { id: freshSection.id },
      data: {
        notes: refinedNotes,
        verificationScore: verification.score || 0,
        verificationIssues: JSON.stringify({
          missingTopics: verification.missingTopics || [],
          issues: verification.issues || [],
          suggestions: verification.suggestions || [],
          attemptHistory,
          auditResult: finalAuditResult
        })
      }
    })

    currentScore = verification.score || 0
    currentNotes = refinedNotes

    if (currentScore === 100 && finalMufettisPassed) {
      console.log(`\n🎉🎉🎉 [VICTORY] Organik 100/100 Tam Puan ve Çifte Onay PASS mührü Round ${round} sonunda yakalandı!`)
      break
    }

    console.log("Waiting 5 seconds before the next loop iteration...")
    await new Promise(r => setTimeout(r, 5000))
  }

  // 5. Auto-refine finished. No automatic backup refreshes without user permission.
  console.log("\nDatabase updated successfully in dev.db.")

  console.log("\n🎉 [AUTO-REFINE FINISHED] Organik Seferberlik Tamamlandı!")
}

run().catch(console.error).finally(() => prisma.$disconnect())
