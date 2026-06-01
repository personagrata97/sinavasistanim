import * as dotenv from "dotenv"
dotenv.config()
import { prisma } from "../src/lib/prisma"
import { verifyNotesAgainstSource, auditNotesAgainstSourceSpecific } from "../src/lib/ai-service"
import { execSync } from "child_process"
import axios from "axios"

// Heuristic: Map audit issues to specific Konu index (1 to 9)
function mapIssueToTopicIndex(issue: string): number {
  // 1. Look for numeric patterns like "1.1", "1.2"..."1.9"
  const match = issue.match(/\b1\.([1-9])\b/)
  if (match) {
    return parseInt(match[1]) // 1 to 9
  }
  
  // 2. Fallback to keyword matching if no numeric pattern found
  const lower = issue.toLowerCase()
  if (lower.includes("kavram") || lower.includes("siber güvenlik") || lower.includes("siber uzay")) return 1
  if (lower.includes("üst yönetim") || lower.includes("sorumluluğu")) return 2
  if (lower.includes("rol") || lower.includes("ekip") || lower.includes("sorumlu")) return 3
  if (lower.includes("farkındalık") || lower.includes("eğitim")) return 4
  if (lower.includes("politika")) return 5
  if (lower.includes("risk")) return 6
  if (lower.includes("sızma") || lower.includes("gözetim") || lower.includes("ölçüm") || lower.includes("kutu")) return 7
  if (lower.includes("ihlal") || lower.includes("some") || lower.includes("kanıt") || lower.includes("log")) return 8
  if (lower.includes("değerlendirme") || lower.includes("denetim")) return 9
  
  return 2 // Default fallback to Konu 2
}

// Custom Gemini Key Rotator and Axiost post calling helper
let currentKeyIdx = 0
async function callGemini(prompt: string): Promise<string> {
  const keys = (process.env.GEMINI_API_KEYS || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").split(",").filter(k => k.trim())
  if (keys.length === 0) {
    throw new Error("No Gemini API keys found in environment!")
  }
  
  for (let attempt = 0; attempt < keys.length * 2; attempt++) {
    const keyIndex = (currentKeyIdx + attempt) % keys.length
    const apiKey = keys[keyIndex]
    
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
        },
        {
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          timeout: 60000
        }
      )
      
      const parts = response.data?.candidates?.[0]?.content?.parts || []
      const textParts = parts.filter((p: any) => p.text && !p.thought).map((p: any) => p.text)
      const result = textParts.join("").trim()
      
      if (result) {
        currentKeyIdx = (keyIndex + 1) % keys.length // Rotate key for next call
        return result
      }
    } catch (err: any) {
      const errMsg = err.message || ""
      const errDetail = err.response?.data?.error?.message || ""
      console.warn(`[AI_ENGINE] Key #${keyIndex + 1} failed: ${errMsg.substring(0, 80)} | ${errDetail.substring(0, 80)}`)
    }
  }
  throw new Error("All Gemini keys failed to generate content!")
}

// Generate the initial notes draft fresh from raw content
async function generateInitialNotes(rawContent: string, title: string, courseName: string): Promise<string> {
  console.log(`🧠 [INITIAL GENERATION] Bölüm 2 için PDF kaynak metninden sıfırdan ders notu üretiliyor...`)
  const prompt = `Sana Sermaye Piyasası resmi kaynağı olan aşağıdaki metni veriyorum.
Bu metinden sıfırdan, yapılandırılmış bir başlangıç ders notu taslağı hazırlamanı istiyorum.

Ders notunun kesintiye uğramadan tamamlanabilmesi için ilk aşamada son derece hafif ve kısa bir taslak hazırla. Her konu başlığının altına o konuyu kısaca özetleyen sadece 1-2 kısa paragraf ekle. Çok detaylı zenginleştirme adımlarını sonraki aşamalarda cerrahi olarak yapacağımız için, bu ilk çıktıda detaylar ve süreler yerine sadece başlıkların eksiksiz olarak kurulması ve yarım kalmaması hayati önemdedir.

Ders notunu en başında şık bir girizgah başlığı ("### 🎯 Bu Bölüm Ne Anlatıyor?") ve hemen altında 9 ana başlık (Konu) altında yapılandıracaksın:

### 🎯 Bu Bölüm Ne Anlatıyor?
[Bölümün önemini, ne anlatacağını ve öğrencinin öğrenmesi gereken en kritik 3-4 odağı anlatan 2 paragraflık şık bir giriş yazısı ve özet kartı.]

Ders notunu 9 ana başlık (Konu) altında yapılandıracaksın. Başlıklar aynen şu şekilde olmalıdır:
## 🏢 Konu 1: Bilgi Güvenliği ve Siber Güvenlik Kavramsal Çerçevesi [[Bilgi Sistemleri Güvenliği]]
## 🏢 Konu 2: Üst Yönetimin Bilgi Güvenliği Sorumluluğu [[Bilgi Sistemleri Güvenliği]]
## 🏢 Konu 3: Roller, Sorumluluklar ve Ekipler [[Bilgi Sistemleri Güvenliği]]
## 🏢 Konu 4: Farkındalık ve Eğitim Süreci [[Bilgi Sistemleri Güvenliği]]
## 🏢 Konu 5: Bilgi Güvenliği Politikası Gereksinimleri [[Bilgi Sistemleri Güvenliği]]
## 🏢 Konu 6: Risk Yönetimi ve Risk İşleme Seçenekleri [[Bilgi Sistemleri Güvenliği]]
## 🏢 Konu 7: Bilgi Güvenliği Gözetimi, Ölçümü ve Sızma Testleri (Beyaz, Siyah, Gri Kutu) [[Bilgi Sistemleri Güvenliği]]
## 🏢 Konu 8: Bilgi Güvenliği İhlal Yönetimi, SOME, Kanıt Toplama ve Loglama [[Bilgi Sistemleri Güvenliği]]
## 🏢 Konu 9: Bilgi Güvenliği Yönetiminin Değerlendirilmesi ve Bağımsız Denetim [[Bilgi Sistemleri Güvenliği]]

TÜRKÇE DİL KALİTESİ:
Notlar pürüzsüz, son derece anlaşılır, resmi ve duru bir Türkçe ile yazılmalıdır. Asla bozuk çeviri kokan cümleler veya yapay zeka jargonu kullanma.

Şimdi sadece ders notunu döndür. Başka hiçbir açıklama yazma.
[RAW SOURCE CONTENT]
${rawContent}`

  return await callGemini(prompt)
}

// Surgical Refinement for a specific topic chunk
async function refineChunk(chunkText: string, topicIssues: string[], rawContent: string): Promise<string> {
  const missingList = topicIssues.join("\n- ")
  const prompt = `Sana bir ders notunun sadece belirli bir başlığa ait olan modülünü (parçasını) ve bu parça ile ilgili giderilmesi gereken teknik, yasal ve pedagojik eksikleri veriyorum.
Görevin, aşağıdaki kurallara harfiyen uyarak bu not parçasını pedagojik ve görsel olarak mükemmel şekilde zenginleştirmek, tablolarla/şemalarla donatmak ve eksiksiz hale getirmektir.

🚫🚫🚫 HATA TOLERANSI SIFIR OLAN KURALLAR:
1. Sana verilen [PREVIOUS TOPIC NOTE] içindeki hiçbir alt başlığı, tabloyu, formülü, mikro-senaryoyu, benzetmeyi veya yasal açıklamayı KESİNLİKLE SİLME, DEĞİŞTİRME veya KISALTMA! Eski metnin tamamını koru ve yeni yasal bilgileri aralara pürüzsüzce entegre et.
2. Çıktı, [PREVIOUS TOPIC NOTE] metninden kesinlikle daha UZUN, detaylı ve görsel olarak zengin olmak zorundadır. Tembellik yapıp metni daraltma veya özetleme!
3. Konu başlığını (örn. ## 🏢 Konu X: ...) ve altındaki biçimlendirmeyi aynen koru.
4. Sadece düzeltilmiş ve zenginleştirilmiş yeni konu parçasını döndür. Başka hiçbir açıklama ("İşte düzelttim" vb.) yazma. Doğrudan Markdown döndür.

🎓 PEDAGOJİK VE GÖRSEL ZENGİNLEŞTİRME KURALLARI:
*   **Benzetmeler ve Mikro-Senaryolar:** Konu içindeki her kritik yasal kural/terim/tanım için günlük hayattan somut bir "💡 Benzetme" ve en fazla 3-5 cümlelik bir "🎬 Mikro-Senaryo / Örnek Olay" yerleştir.
    - *Format:*
      - **Resmi Terim / Kural:** Kaynak metindeki orijinal tanım veya kural cümleleri...
        - 💡 *Benzetme:* Terimi veya yasal kuralı akılda tutacak günlük hayattan gerçekçi ve somut benzetme.
        - 🎬 *Mikro-Senaryo - [Kısa Başlık]:* Bu kuralın/sürenin pratikte nasıl işlediğini anlatan 3-5 cümlelik mini olay örgüsü. (⚠️ Kalın başlığın hemen ardına mutlaka iki nokta ve tire ":**" koy! Örn: "🎬 *Mikro-Senaryo - Ali Bey'in İhlali:* Ali Bey...")
*   📊 **Markdown Tabloları:** Süreleri, yetkileri, limitleri, cezaları ve karşılaştırmalı verileri şık Markdown tablolarına dönüştürerek görselleştirmeyi kolaylaştır.
*   🔄 **Süreç Akışı (Mermaid.js):** Konuda ardışık veya kronolojik bir süreç varsa (Örn: İhlal bildirim adımları, sızma testi aşamaları vb.) Mermaid diyagramı ekle.

🔍 GİDERİLECEK EKSİK / DÜZELTİLECEK BULGU LİSTESİ:
- ${missingList}

---

[PREVIOUS TOPIC NOTE]
${chunkText}

---

[RAW MÜFREDAT KAYNAK METNİ]
${rawContent}`

  return await callGemini(prompt)
}

// Normalize headings to standard form to prevent splitting failures
function normalizeHeadings(text: string): string {
  let normalized = text
  for (let i = 1; i <= 9; i++) {
    // Matches variations of "Konu i" or "1.i" headings, starting strictly with markdown headings (## or ###)
    const regex = new RegExp(`(?:^|\\n)[ \\t]*(?:#{2,3})[ \\t]*(?:🏢)?[ \\t]*(?:Konu[ \\t]*:?[ \\t]*${i}\\b|1\\.${i}\\b)[^\\n]*`, 'gi')
    normalized = normalized.replace(regex, (match) => {
      // Clean out prefix up to "Konu i" or "1.i" to isolate actual title text
      const titlePart = match.replace(/[\s\S]*?(?:Konu[ \t]*:?[ \t]*\d+|1\.\d+)[ \t]*:?[ \t]*/i, "").trim()
      return `\n## 🏢 Konu ${i}: ${titlePart}`
    })
  }
  return normalized
}

// Split the full notes into 10 parts (parts[0] is Intro, parts[1-9] are Konu 1 to 9)
function splitIntoChunks(text: string): string[] {
  const normalized = normalizeHeadings(text)
  // Smart regex lookahead matches both newlines and start of string boundaries to avoid index shifts
  const parts = normalized.split(/(?=\n## 🏢 Konu \d+|^## 🏢 Konu \d+)/g)
  if (parts.length > 0 && parts[0].trim().startsWith("## 🏢 Konu 1")) {
    parts.unshift("")
  }
  return parts
}

// Reassemble chunks back together
function assembleChunks(parts: string[]): string {
  return parts.map((p, idx) => {
    const trimmed = p.trim()
    if (!trimmed) return ""
    if (idx === 0) return trimmed
    return `\n\n${trimmed}`
  }).join("").trim()
}

async function run() {
  console.log("🚀 [MODULAR AUTO-REFINE SECTION 2] Modüler Cerrahi İyileştirme Operasyonu Başlatıldı...")

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
  
  // SIFIRDAN TERTEMİZ ÜRETİM BAŞLANGICI (Yedekten hiçbir veri çekilmez!)
  let currentNotes = ""
  let chunks: string[] = []
  
  for (let genAttempt = 1; genAttempt <= 3; genAttempt++) {
    currentNotes = await generateInitialNotes(rawContent, section.title, course.name)
    chunks = splitIntoChunks(currentNotes)
    if (chunks.length === 10) {
      console.log(`Taslak başarıyla 10 modüle bölündü (Deneme #${genAttempt}).`)
      break
    }
    console.warn(`⚠️ Taslak ayrıştırma denemesi #${genAttempt} başarısız: Modül sayısı 10 olması gerekirken ${chunks.length} oldu. Yeniden deneniyor...`)
  }

  if (chunks.length < 10) {
    console.error("❌ Başlangıç ders notunda 9 ana konu başlığı tam olarak üretilemedi! İşlem durduruluyor.")
    return
  }

  let currentScore = 0
  let attemptHistory: any[] = []

  for (let round = 1; round <= maxAttempts; round++) {
    console.log(`\n============================================================`)
    console.log(`🔄 [MODULAR ROUND ${round}/${maxAttempts}]`)
    console.log(`============================================================`)

    // Split the notes into chunks
    chunks = splitIntoChunks(currentNotes)
    console.log(`Metin modüllere ayrıştırıldı. Toplam modül sayısı: ${chunks.length}`)
    
    if (chunks.length < 10) {
      console.error(`❌ [GÜVENLİK KALKANI] Modül sayısı beklenenden az (${chunks.length}/10). Veri kaybını ve daralmayı önlemek için bu raunt durduruldu!`)
      return
    }

    // Verify notes (Uyum Kontrolörü)
    console.log("\nRunning Uyum Kontrolörü verification...")
    const verification = await verifyNotesAgainstSource(
      rawContent,
      currentNotes,
      section.title,
      undefined,
      section.pageStart,
      section.pageEnd
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
        const audit = await auditNotesAgainstSourceSpecific(rawContent, currentNotes, section.title, pack, undefined, section.pageStart, section.pageEnd)
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

    // Gather all target exclusions/issues
    const allIssues = [
      ...verification.missingTopics.map((t: string) => `Eksik Konu (Kontrolör): ${t}`),
      ...verification.issues.map((i: string) => `Bilgi Hatası/Uyumsuzluk (Kontrolör): ${i}`),
      ...verification.suggestions.map((s: string) => `İyileştirme Önerisi (Kontrolör): ${s}`),
      ...allMissingDetails.map((d: string) => `Kılcal Detay Eksiği (Müfettiş): ${d}`),
      ...allContradictions.map((c: string) => `Bilgi Uyuşmazlığı (Müfettiş): ${c}`)
    ]

    if (allIssues.length === 0 && verification.score === 100 && finalMufettisPassed) {
      console.log(`\n🎉🎉🎉 [VICTORY] Organik 100/100 Tam Puan ve Çifte Onay PASS mührü Round ${round} sonunda yakalandı!`)
      break
    }

    console.log(`\n🔍 Tespit Edilen Eksiklik/Geliştirme Sayısı: ${allIssues.length}`)

    // Group issues by topic index (1 to 9)
    const issuesByTopicIndex: Record<number, string[]> = {}
    for (const issue of allIssues) {
      const idx = mapIssueToTopicIndex(issue)
      if (!issuesByTopicIndex[idx]) issuesByTopicIndex[idx] = []
      issuesByTopicIndex[idx].push(issue)
    }

    // Surgical Refinement for each chunk that has issues
    let modifiedAny = false
    for (let i = 1; i <= 9; i++) {
      const topicIssues = issuesByTopicIndex[i]
      if (topicIssues && topicIssues.length > 0) {
        console.log(`\n🛠️  [CERRAHİ MÜDAHALE] Konu ${i} iyileştiriliyor... (Eksik bulgu sayısı: ${topicIssues.length})`)
        const previousChunk = chunks[i] || ""
        if (!previousChunk) {
          console.warn(`⚠️ Modül ${i} boş veya bulunamadı, iyileştirme atlanıyor.`)
          continue
        }
        try {
          const refinedChunk = await refineChunk(previousChunk, topicIssues, rawContent)
          chunks[i] = refinedChunk
          modifiedAny = true
          console.log(`   ✅ Modül ${i} başarıyla zenginleştirildi (${refinedChunk.length} karakter).`)
        } catch (err: any) {
          console.error(`   ❌ Modül ${i} iyileştirilemedi: ${err.message}`)
        }
      }
    }

    if (modifiedAny) {
      currentNotes = assembleChunks(chunks)
      console.log(`\nBirleştirilmiş yeni not uzunluğu: ${currentNotes.length} karakter.`)
    }

    // Update history
    attemptHistory.push({
      attempt: round,
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
      where: { id: section.id },
      data: {
        notes: currentNotes,
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

    console.log("Waiting 5 seconds before the next loop iteration...")
    await new Promise(r => setTimeout(r, 5000))
  }

  console.log("\nDatabase updated successfully in dev.db.")
  console.log("\n🎉 [AUTO-REFINE FINISHED] Organik Modüler Seferberlik Tamamlandı!")
}

run().catch(console.error).finally(() => prisma.$disconnect())
