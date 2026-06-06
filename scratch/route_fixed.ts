import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractAllText, detectSectionsMultimodal, detectSectionsTextAI, checkPdfQuality, extractSectionsRegex } from "@/lib/pdf-engine"
import { analyzeSectionContent, generateCourseNotes, generateFlashcards, generateQuestions, setFileUrisMap, auditNotesAgainstSourceSpecific } from "@/lib/ai-service"
import { generateStudySchedule } from "@/lib/schedule-engine"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { readFile } from "fs/promises"
import { activeProcesses, cancelledProcesses } from "@/lib/process-registry"
import { COURSE_PAGE_OVERRIDES } from "@/lib/course-configs"

// Chapter/section detection patterns for Turkish academic PDFs
const SECTION_PATTERNS = [
  /^(BÖLÜM|Bölüm|bölüm)\s*(\d+)\s*[:.–-]\s*(.+)/,
  /^(KONU|Konu)\s*(\d+)\s*[:.–-]\s*(.+)/,
  /^(\d+)\.\s+(BÖLÜM|KONU|KISIM)\s*[:.–-]?\s*(.+)/i,
  /^(\d+)\.\s+([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü\s]{10,})/,
  /^(ÜNİTE|Ünite)\s*(\d+)\s*[:.–-]\s*(.+)/,
  /^\d+\.\d*\s+[A-ZÇĞİÖŞÜ]{2,}/,
]

interface DetectedSection {
  title: string
  pageStart: number
  pageEnd: number
  content: string
}

// ==================== KARAKTER BAZLI CHUNK BOYUTU ====================
// Büyük chunk = daha derin içerik, daha kaliteli sorular
// 1 sayfa ortalama ~2000 karakter → 12-15 sayfa = 25000 karakter
// Küçük chunk'lar sığ/tekrarlı içerik üretiyor!
const MAX_CHUNK_CHARS = 12000 // ~5 sayfa = daha detaylı, eksik konu riski düşük

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.warn("[PROCESS] 🔴 Yetkisiz tetikleme engellendi.")
      return NextResponse.json({ error: "Yetkilendirme gerekli" }, { status: 401 })
    }

    const { slug, forceRetry = false } = await req.json()
    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 })

    const course = await prisma.course.findUnique({
      where: { slug },
      include: { program: true }
    })
    if (!course || !course.pdfPath) {
      return NextResponse.json({ error: "Ders dosyası bulunamadı." }, { status: 404 })
    }

    // Zombi işlemi önleme: Eğer önceden iptal edildiyse listeden çıkar
    if (cancelledProcesses.has(slug)) {
      cancelledProcesses.delete(slug)
      activeProcesses.delete(slug)
    }

    // 🔒 Çift tıklama koruması: Sadece aktif olarak bellek üzerindeyse engelle
    if (activeProcesses.has(slug)) {
      if (forceRetry) {
        console.log(`[PROCESS] 🔄 Zombi kilit tespit edildi, forceRetry ile kilit kırılıyor: ${course.name}`);
        activeProcesses.delete(slug);
      } else {
        console.log(`[PROCESS] ⚠️ Zaten işlemde (bellekte aktif): ${course.name} — tekrar tetikleme engellendi.`)
        return NextResponse.json({ message: "İşlem zaten arka planda devam ediyor. Lütfen birkaç dakika bekleyin." }, { status: 200 })
      }
    }

    activeProcesses.add(slug)

    // Update status
    await prisma.course.update({
      where: { slug },
      data: { status: "processing" }
    })

    // Read PDF buffer
    const pdfBuffer = await readFile(course.pdfPath)
    const totalPages = course.totalPages

    // ========== PHASE 1 & 2: Extract text & detect sections (hızlı, senkron) ==========
    const existingSections = await prisma.section.count({ where: { courseId: course.id } })

    if (existingSections === 0) {
      console.log(`[PROCESS] İlk işleme: ${course.name} (${totalPages} sayfa)...`)

      const pageTexts = await extractAllText(pdfBuffer)

      // ⚠️ NON-SEARCHABLE PDF KALİTE KONTROLÜ
      const pdfQuality = checkPdfQuality(pageTexts, totalPages)
      if (pdfQuality.isNonSearchable) {
        console.error(`[PROCESS] 🔴 NON-SEARCHABLE PDF: ${pdfQuality.message}`)
        await prisma.course.update({
          where: { slug },
          data: { status: "error" }
        })
        activeProcesses.delete(slug)
        return NextResponse.json({
          error: pdfQuality.message || "Bu PDF'den metin çıkarılamadı. Lütfen metin tabanlı (searchable) bir PDF yükleyin."
        }, { status: 400 })
      }
      if (pdfQuality.isPartiallySearchable) {
        console.warn(`[PROCESS] ⚠️ KISMEN SEARCHABLE: ${pdfQuality.message}`)
      }

      await prisma.course.update({
        where: { slug },
        data: { processedPages: pageTexts.length }
      })
      console.log(`[PROCESS] ${pageTexts.length} sayfadan metin çıkarıldı.`)

      // E-8: Önce multimodal (Gemini görsel) bölüm algılama dene, yoksa regex fallback
      let sections: DetectedSection[] = []
      const geminiKeys = (process.env.GEMINI_API_KEYS || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").split(",").filter(k => k.trim())

      let tocAttempts = 0;
      const MAX_TOC_ATTEMPTS = 3; // 50 yerine 3 deneme = regex yedeğine hızlı geçiş

      while (sections.length === 0 && tocAttempts < MAX_TOC_ATTEMPTS && geminiKeys.length > 0) {
        tocAttempts++;
        console.log(`[PROCESS] 🔄 İçindekiler Tablosu aranıyor (Deneme ${tocAttempts}/${MAX_TOC_ATTEMPTS})...`);

        if (course.geminiFileUri) {
          for (let k = 0; k < geminiKeys.length; k++) {
            try {
              console.log(`[PROCESS] 🔍 Multimodal bölüm algılama deneniyor (Key #${k + 1}/${geminiKeys.length})...`)
              const multimodalSections = await detectSectionsMultimodal(course.geminiFileUri, geminiKeys[k].trim())
              if (multimodalSections && multimodalSections.length >= 2) {
                console.log(`[PROCESS] ✅ Multimodal: ${multimodalSections.length} bölüm algılandı (Key #${k + 1})`)
                // Multimodal sonuçları rawContent ile eşleştir
                sections = multimodalSections.map(ms => ({
                  title: ms.title,
                  pageStart: ms.pageStart,
                  pageEnd: ms.pageEnd,
                  content: pageTexts.slice(Math.max(0, ms.pageStart - 1), ms.pageEnd).join("\n\n")
                }))
                break; // Başarılı, döngüden çık
              } else {
                console.log(`[PROCESS] ⚠️ Multimodal yetersiz sonuç (${multimodalSections?.length || 0}) (Key #${k + 1})`)
              }
            } catch (mmErr: any) {
              console.warn(`[PROCESS] ⚠️ Multimodal başarısız (Key #${k + 1}): ${mmErr.message?.substring(0, 100)}`)
              if (k < geminiKeys.length - 1) {
                console.log(`[PROCESS] ⏱️ Burst limit koruması: Sonraki anahtara geçmeden önce 2 saniye bekleniyor...`)
                await new Promise(resolve => setTimeout(resolve, 2000))
              }
            }
          }
        }

        // Multimodal başarısızsa METİN TABANLI AI YEDEĞİNE (Text AI Fallback) geç
        if (sections.length === 0) {
          console.log(`[PROCESS] ⚠️ Multimodal çöktü, METİN TABANLI AI YEDEĞİNE (Text AI) geçiliyor...`)
          for (let k = 0; k < geminiKeys.length; k++) {
            try {
              console.log(`[PROCESS] 🧠 Text AI bölüm algılama deneniyor (Key #${k + 1}/${geminiKeys.length})...`)
              const textAiSections = await detectSectionsTextAI(pageTexts, geminiKeys[k].trim())
              if (textAiSections && textAiSections.length >= 2) {
                console.log(`[PROCESS] ✅ Text AI: ${textAiSections.length} bölüm algılandı (Key #${k + 1})`)
                sections = textAiSections.map(ms => ({
                  title: ms.title,
                  pageStart: ms.pageStart,
                  pageEnd: ms.pageEnd,
                  content: pageTexts.slice(Math.max(0, ms.pageStart - 1), ms.pageEnd).join("\n\n")
                }))
                break; // Başarılı, döngüden çık
              } else {
                console.log(`[PROCESS] ⚠️ Text AI yetersiz sonuç (${textAiSections?.length || 0}) (Key #${k + 1})`)
              }
            } catch (aiErr: any) {
              console.warn(`[PROCESS] ⚠️ Text AI başarısız (Key #${k + 1}): ${aiErr.message?.substring(0, 100)}`)
              if (k < geminiKeys.length - 1) {
                console.log(`[PROCESS] ⏱️ Burst limit koruması: Sonraki anahtara geçmeden önce 2 saniye bekleniyor...`)
                await new Promise(resolve => setTimeout(resolve, 2000))
              }
            }
          }
        }

        // İkisi de çöktüyse REGEX (Zırhlı) yedeğe geç!
        if (sections.length === 0) {
          console.log(`[PROCESS] ⛔ Tüm AI denemeleri çöktü! Zırhlı REGEX yedeğine geçiliyor...`)
          const regexSections = extractSectionsRegex(pageTexts)
          if (regexSections.length >= 2) {
            console.log(`[PROCESS] ✅ REGEX: ${regexSections.length} bölüm algılandı!`)
            sections = regexSections.map(rs => ({
              title: rs.title,
              pageStart: rs.pageStart,
              pageEnd: rs.pageEnd,
              content: pageTexts.slice(Math.max(0, rs.pageStart - 1), rs.pageEnd).join("\n\n")
            }))
          } else {
            console.log(`[PROCESS] ⛔ REGEX de başarısız! Mecburen bekleniyor...`)
            const waitMinutes = Math.min(Math.pow(2, tocAttempts - 1), 15);
            const waitMs = waitMinutes * 60000;
            console.log(`[PROCESS] ⛔ Ban yememek için bekleme süresi uzatılıyor. ${waitMinutes} dakika (${waitMs}ms) bekleniyor...`)
            await new Promise(resolve => setTimeout(resolve, waitMs))
          }
        }

        if (sections.length > 0) {
          // =========================================================================
          // GLOBAL ZIRH: MULTIMODAL VEYA TEXT AI FARK ETMEZ, YZ HALÜSİNASYONLARINI EZ
          // =========================================================================
          console.log(`[PROCESS] 🛡️ Global Zırh Devrede: Başlıklar temizleniyor...`)

          // >>> AHMET/MEHMET/SAYFA KAYMASI KESİN ÇÖZÜMÜ <<<
          // Yapay zeka ve Global Zırh tamamen devre dışı! Sayfalar %100 fiziksel ve elle onaylanmış sayfalara sabitlendi.
          let rawSections: any[] = COURSE_PAGE_OVERRIDES[slug] || [];
          if (rawSections.length > 0) {
            sections = rawSections.map(rs => ({
              title: rs.title,
              pageStart: rs.pageStart,
              pageEnd: rs.pageEnd,
              content: pageTexts.slice(Math.max(0, rs.pageStart - 1), rs.pageEnd).join("\n\n")
            }));
            console.log(`[PROCESS] 🛡️ YAPAY ZEKA VE GLOBAL ZIRH İPTAL EDİLDİ! SAYFALAR %100 SABİT (CONFIG) OLARAK YÜKLENDİ.`);
          } else {
            // Standart İşleme
            for (let i = 0; i < sections.length; i++) {
              let cleanTitle = sections[i].title.replace(/^(Bölüm|Ünite|Kısım)?\s*\d+[\.\-\:]?\s*/i, "").trim()
              if (!cleanTitle || cleanTitle.length < 3) {
                cleanTitle = sections[i].title.trim() // Boş kalırsa orijinali kullan
              }
              sections[i].title = cleanTitle
            }

            console.log(`[PROCESS] 🛡️ Global Zırh: Sayfa numaraları fiziksel metin taramasıyla düzeltiliyor...`)

            const tocPages = new Set<number>()
            for (let p = 0; p < Math.min(15, pageTexts.length); p++) {
              const text = pageTexts[p].toLowerCase()
              let matchCount = 0
              for (const s of sections) {
                if (text.includes(s.title.toLowerCase())) matchCount++
              }
              if (matchCount >= 3) {
                tocPages.add(p)
                console.log(`[PROCESS] 🛡️ TOC sayfası tespit edildi: ${p + 1} (${matchCount} başlık eşleşti)`)
              }
            }

            for (let i = 0; i < sections.length; i++) {
              const section = sections[i]
              let truePage = -1;
              const titleLower = section.title.toLowerCase()

              for (let p = 0; p < pageTexts.length; p++) {
                if (tocPages.has(p)) continue
                const firstLines = pageTexts[p].split('\n').slice(0, 8).join('\n').toLowerCase()
                if (firstLines.includes(titleLower)) {
                  truePage = p + 1;
                  break;
                }
              }

              if (truePage === -1) {
                for (let p = 0; p < pageTexts.length; p++) {
                  if (tocPages.has(p)) continue
                  if (pageTexts[p].toLowerCase().includes(titleLower)) {
                    truePage = p + 1;
                    break;
                  }
                }
              }

              if (truePage !== -1 && truePage !== section.pageStart) {
                console.log(`[PROCESS] 🛡️ Offset Düzeltildi: "${section.title}" (YZ: ${section.pageStart} -> Gerçek: ${truePage})`)
                section.pageStart = truePage;
              }
            }

            let bibliographyPageStart = pageTexts.length + 1;
            for (let p = Math.max(0, pageTexts.length - 15); p < pageTexts.length; p++) {
              const lines = pageTexts[p].split('\n').slice(0, 15).map(l => l.trim().toLocaleUpperCase('tr-TR'));
              if (lines.some(l => l === 'KAYNAKÇA' || l === 'KAYNAKLAR' || l === 'REFERENCES' || l === 'BİBLİYOGRAFYA')) {
                bibliographyPageStart = p + 1;
                console.log(`[PROCESS] 📚 Kaynakça tespit edildi (Sayfa ${bibliographyPageStart}). Son bölüm bu sayfadan önce bitecek.`);
                break;
              }
            }
            for (let i = 0; i < sections.length; i++) {
              if (i < sections.length - 1) {
                sections[i].pageEnd = Math.max(sections[i].pageStart, sections[i + 1].pageStart - 1);
              } else {
                sections[i].pageEnd = Math.max(sections[i].pageStart, bibliographyPageStart - 1);
              }
              // 3. İçeriği (content) doğru sayfalara göre yeniden kes
              sections[i].content = pageTexts.slice(Math.max(0, sections[i].pageStart - 1), sections[i].pageEnd).join("\n\n");
            }
          }
          console.log(`[PROCESS] 🛡️ Global Zırh İşlemi Tamamlandı.`);
        }

    // 🚨 EN KÖTÜ SENARYO: Tüm denemelere rağmen çökerse...
    if (sections.length === 0) {
      console.error(`[PROCESS] 🚨 FATAL: ${MAX_TOC_ATTEMPTS} denemeye rağmen İçindekiler çıkarılamadı! PDF zorunlu olarak tek parça halinde işlenecek.`)
      sections = [{
        title: "Bölüm İçeriği (Ana Metin)",
        pageStart: 1,
        pageEnd: totalPages,
        content: pageTexts.join("\n\n")
      }]
    }

    // ⚠️ İÇİNDEKİLER / ÖNSÖZ / KAPAK FİLTRESİ
    // Bu sayfalar not üretimi için anlamsızdır — filtrelenir
    const TOC_KEYWORDS = ["İÇİNDEKİLER", "ÖNSÖZ", "FOREWORD", "TABLE OF CONTENTS", "PREFACE", "SUNUŞ"]
    sections = sections.filter(sec => {
      const titleUpper = sec.title.toLocaleUpperCase("tr-TR")
      const contentFirst500 = sec.content.substring(0, 500).toLocaleUpperCase("tr-TR")
      const isTocOrForeword = TOC_KEYWORDS.some(kw => titleUpper.includes(kw) || contentFirst500.includes(kw))
      if (isTocOrForeword && sec.content.length < 3000) {
        console.log(`[PROCESS] 🗑️ İçindekiler/önsöz filtresi: "${sec.title}" (Sayfa ${sec.pageStart}-${sec.pageEnd}) atlandı.`)
        return false
      }
      return true
    })

    console.log(`[PROCESS] ${sections.length} bölüm algılandı (İçindekiler filtresi sonrası).`)

    // ⚠️ KAYNAKÇA BÖLÜMÜ FİLTRESİ (TAMAMEN SİLME)
    // Kaynakça sınavda sorulmaz — UI'da veya veritabanında yer kaplamaması için tamamen atılır
    const BIBLIO_KEYWORDS = ["KAYNAKÇA", "KAYNAKLAR", "REFERENCES", "BİBLİYOGRAFYA", "SINAV ALT KONU"]
    sections = sections.filter(sec => {
      const titleUpper = sec.title.toLocaleUpperCase("tr-TR")
      const isBibliography = BIBLIO_KEYWORDS.some(kw => titleUpper.includes(kw))
      if (isBibliography) {
        console.log(`[PROCESS] 🗑️ Kaynakça filtresi: "${sec.title}" (Sayfa ${sec.pageStart}-${sec.pageEnd}) veritabanına eklenmeyecek.`)
        return false
      }
      return true
    })

    console.log(`[PROCESS] ${sections.length} bölüm algılandı (Tüm filtreler sonrası).`)

    for (let i = 0; i < sections.length; i++) {
      await prisma.section.create({
        data: {
          courseId: course.id,
          title: sections[i].title,
          order: i + 1,
          pageStart: sections[i].pageStart,
          pageEnd: sections[i].pageEnd,
          rawContent: sections[i].content,
          processed: false,
          notes: null,
        }
      })
    }
  } else {
    console.log(`[PROCESS] Devam: ${existingSections} bölüm zaten var, kaldığı yerden devam ediliyor...`)
  }

  // ========== PHASE 3+4: AI Analysis + Schedule — ARKA PLANDA ==========
  // HTTP response'u hemen dön. AI analizi Node.js event loop'unda arka planda devam eder.
  // Bu sayede Next.js API route timeout (~60sn) sorunu çözülür.
  processInBackground(slug, course).catch(err => {
    console.error("[BG_FATAL]", err)
    prisma.course.update({ where: { slug }, data: { status: "error" } }).catch(() => { })
  })

  return NextResponse.json({ success: true, message: "İşleme başlatıldı" })
} catch (error: any) {
  console.error("[PROCESS_FATAL]", error)
  return NextResponse.json({ error: error.message }, { status: 500 })
}
}

// ==================== BACKGROUND PROCESSING ====================
// HTTP response döndükten sonra Node.js event loop'unda çalışmaya devam eder.
// Timeout problemi olmaz çünkü artık HTTP request'e bağlı değil.

async function processInBackground(slug: string, course: any) {
  try {
    // Her key'in kendi fileUri'sini ayarla — merkezi helper ile (DRY)
    const { ensureGeminiFileUris } = await import("@/lib/gemini-file-helper")
    const { uriMap, updated: updatedUris } = await ensureGeminiFileUris(
      course.pdfPath || "",
      course.geminiFileUris,
      course.slug || slug
    )

    if (updatedUris) {
      await prisma.course.update({
        where: { id: course.id },
        data: {
          geminiFileUri: uriMap["0"] || course.geminiFileUri,
          geminiFileUris: JSON.stringify(uriMap)
        }
      })
      console.log(`[BG] 💾 Yeni fileUri'ler veri tabanına başarıyla kaydedildi.`)
    }

    setFileUrisMap(uriMap)
    const geminiKeys = (process.env.GEMINI_API_KEYS || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").split(",").filter(k => k.trim())
    console.log(`[BG] 📄 Toplam ${Object.keys(uriMap).length}/${geminiKeys.length} key için fileUri tanımlandı`)

    const savedSections = await prisma.section.findMany({
      where: { courseId: course.id, processed: false },
      orderBy: { order: "asc" }
    })

    const totalSections = await prisma.section.count({ where: { courseId: course.id } })
    const alreadyDone = totalSections - savedSections.length
    console.log(`[BG] AI: ${savedSections.length} kalan (${alreadyDone}/${totalSections} bitti)`)

    // KULLANICI KESİN TALİMATI: "Kaliteden taviz yok, pes etmeyecek, zaman önemli değil!"
    const MAX_RETRIES = 5 // API limitlerini boğmamak için 15'ten 5'e indirildi
    const aiMode = course.program?.aiMode || "general"
    let hasCriticalError = false
    let isPausedForApproval = false

    for (let sIdx = 0; sIdx < savedSections.length; sIdx++) {
      // ZOMBİ SÜREÇ (KILL-SWITCH) KONTROLÜ
      if (cancelledProcesses.has(slug)) {
        console.warn(`[BG_KILL] 💀 Zombi süreç tespit edildi ve API istekleri durduruldu: ${slug}`)
        hasCriticalError = true;
        break; // Loop'tan çık, api kotası harcama
      }

      const section = savedSections[sIdx]

      // 300 karaktere çektik (yaklaşık 40 kelime). 800 çok agresifti ve kısa ama önemli (formül vb.) sayfaları atlayabilirdi.
      // 300 karakter altı kesinlikle İçindekiler veya Önsöz kırıntısıdır, kotayı boşa harcamamak için pas geçilir.
      if (section.rawContent.length < 300) {
        try { await prisma.section.update({ where: { id: section.id }, data: { processed: true } }) } catch { }
        continue
      }

      let success = false
      let sectionRetries = 0
      const maxSectionRetries = 5

      while (!success && sectionRetries < maxSectionRetries) {
        if (sectionRetries > 0) {
          console.log(`[BG] 🔄 [${section.title}] Geçici kota aşımı engeli nedeniyle 60 saniye bekleniyor... (Bölüm Denemesi #${sectionRetries + 1}/${maxSectionRetries})`)
          await new Promise(r => setTimeout(r, 60000))
        }

        // Bölüm işleme ana try-catch bloğu
        try {
          console.log(`[BG] [${sIdx + 1 + alreadyDone}/${totalSections}] ${section.title} - İŞLEME BAŞLADI (Deneme #${sectionRetries + 1}/${maxSectionRetries})`)

          try { await prisma.section.update({ where: { id: section.id }, data: { verificationIssues: JSON.stringify({ currentMicroPhase: `${sIdx + 1}/${totalSections}. Bölüm Notları Çıkarılıyor (Deneme #${sectionRetries + 1})` }) } }) } catch { }

          let notes = section.notes || ""
          let currentScore = section.verificationScore || 0
          let bestScore = currentScore // En yüksek başarılı doğrulama skoru — kota hatalarında korunur
          let bestNotes = notes // En yüksek skora sahip notlar
          let lastVerification: any = null
          let notesAttemptSuccess = false
          let attemptHistory: any[] = []
          let quotaFailures = 0 // FIX #4: Kota hatalarını ayrı say, gerçek deneme hakkını yemesin
          const MAX_QUOTA_FAILURES = 5 // Toplam kota hatası limiti (sonsuz döngü koruması)

          // Eğer halihazırda yüksek puanlı notlar varsa kalite döngüsünü atla
          if (notes && notes.length > 500 && currentScore >= 98) {
            console.log(`[BG] 🌟 [${section.title}] Zaten kusursuz (%${currentScore}) notlara sahip. Not üretimi atlanıyor, doğrudan eksik materyaller (soru/flashcard) üretilecek.`)
            notesAttemptSuccess = true
          }

          // ==================== KALİTE DÖNGÜSÜ (Not Üretimi ve Doğrulama) ====================
          // En fazla 5 GERÇEK deneme. Kota hataları deneme hakkından düşmez.
          if (!notesAttemptSuccess) {
            for (let vAttempt = 1; vAttempt <= MAX_RETRIES; vAttempt++) {
              try {
                console.log(`[BG] Not Üretim Denemesi #${vAttempt}...`)

                // ==================== SMART INJECT (TARGETED REFINEMENT) KONTROLÜ ====================
                let isSmartInject = false;
                let enrichedContent = section.rawContent;

                if (vAttempt > 1 && lastVerification) {
                  const feedbackItems: string[] = [];
                  if (lastVerification.missingTopics?.length > 0) {
                    feedbackItems.push("ATLANAN KONULAR (Kesinlikle ekle):\n- " + lastVerification.missingTopics.join("\n- "));
                  }
                  if (lastVerification.issues?.length > 0) {
                    feedbackItems.push("BİLGİ/MANTIK HATALARI (Kesinlikle düzelt):\n- " + lastVerification.issues.join("\n- "));
                  }
                  if (lastVerification.suggestions?.length > 0) {
                    feedbackItems.push("GELİŞTİRME ÖNERİLERİ (İyileştir):\n- " + lastVerification.suggestions.join("\n- "));
                  }

                  if (feedbackItems.length > 0) {
                    // ==================== 3-KATMANLI KUSURSUZ YÖNLENDİRME (Smart Routing) ====================

                    // 1. Kontrolör Yapısal Puanını al
                    const kontrolorStructuralScore = lastVerification.score; // lastVerification.score Kontrolör'ün yapısal iskelet puanıdır.

                    // 2. Müfettişin Critical bulgu sayısını hesapla
                    let prevCriticalCount = 0;
                    if (lastVerification.inspectorFindings) {
                      prevCriticalCount = lastVerification.inspectorFindings.filter((f: any) => f.severity === 'CRITICAL').length;
                    } else {
                      // Eski format veya Kontrolör'ün kendi bulduğu yapısal eksiklik durumu
                      const hasMajorMissingTopics = lastVerification.missingTopics?.some((t: string) => !t.includes("[MÜFETTİŞ"));
                      if (hasMajorMissingTopics) prevCriticalCount = 10; // Yapısal iskelet eksiği varsa sıfırdan yazmaya zorla
                    }

                    // 3. Yönlendirme Kararı

                    // Daha önce kaç kere Smart Inject yapıldığını say
                    const pastSmartInjects = attemptHistory.filter((h: any) => h.isSmartInject).length;
                    const lastAttemptWasSmartInject = attemptHistory.length > 0 ? attemptHistory[attemptHistory.length - 1].isSmartInject : false;

                    if (kontrolorStructuralScore < 70) {
                      // İskelet çok zayıf
                      console.log(`[BG] ⛔ Yapısal İskelet Çok Zayıf (Kontrolör: %${kontrolorStructuralScore} < 70): Yama yapılmaz, sıfırdan yazım devreye giriyor...`);
                      isSmartInject = false;
                    } else if (kontrolorStructuralScore >= 70 && kontrolorStructuralScore < 85) {
                      // İskelet orta seviye
                      if (prevCriticalCount <= 3) {
                        console.log(`[BG] 🧠 Yapısal İskelet Orta (%${kontrolorStructuralScore}) ve KRİTİK bulgu az (${prevCriticalCount} ≤ 3): 2-Aşamalı Biçim-Duyarlı Akıllı Yama devreye giriyor...`);
                        isSmartInject = true;
                      } else {
                        console.log(`[BG] ⛔ Yapısal İskelet Orta (%${kontrolorStructuralScore}) ama çok fazla KRİTİK boşluk var (${prevCriticalCount} > 3): Sıfırdan yazıma dönülüyor...`);
                        isSmartInject = false;
                      }
                    } else {
                      // İskelet sağlam (>= 85)
                      // "Müfettiş 5 bulgu da bulsa, 15 de bulsa, bunlar yapısal değil bilgisel eksikler. Sağlam iskelete Format-Duyarlı enjeksiyon ile yerleştirilir."
                      isSmartInject = true;
                    }

                    // ==================== KATMAN 3: DOĞRULAMA KALKANI ====================
                    // Cilalama sonrası Müfettiş TEK BİR son kontrol daha yapar. Eğer hâlâ CRITICAL bulgu varsa:
                    if (lastAttemptWasSmartInject && prevCriticalCount > 0) {
                      if (prevCriticalCount > 2) {
                        console.log(`[BG] ⚠️ Katman 3 Kalkanı: Cilalama sonrası ${prevCriticalCount} KRİTİK bulgu kaldı (> 2). Yapay zeka konuyu sürekli atlıyor, sıfırdan yazıma dönülüyor.`);
                        isSmartInject = false;
                      } else {
                        // Bulgu sayısı <= 2 ise
                        if (pastSmartInjects >= 2) {
                          console.log(`[BG] ⚠️ Katman 3 Kalkanı: 2 tur Smart Inject yapılmasına rağmen KRİTİK bulgu sıfırlanamadı. "Kör Nokta" tespit edildi, yama anlamsız, sıfırdan yazıma dönülüyor.`);
                          isSmartInject = false;
                        } else {
                          console.log(`[BG] 🛡️ Katman 3 Kalkanı: Cilalama sonrası ${prevCriticalCount} KRİTİK bulgu kaldı (≤ 2). Bir tur daha Smart Inject yapılıyor.`);
                          isSmartInject = true;
                        }
                      }
                    } else if (kontrolorStructuralScore >= 85 && !lastAttemptWasSmartInject) {
                      console.log(`[BG] 🧠 Yapısal İskelet Sağlam (Kontrolör: %${kontrolorStructuralScore} ≥ 85): 2-Aşamalı Biçim-Duyarlı Akıllı Yama (Smart Inject + Polish) devreye giriyor...`);
                    }

                    if (isSmartInject) {
                      const { smartInjectCourseNotes } = await import("@/lib/ai-service");
                      notes = await smartInjectCourseNotes(
                        notes, // Eski mükemmel not
                        feedbackItems.join("\n\n"),
                        section.title,
                        course.name,
                        course.userLevel,
                        aiMode
                      );
                    } else {
                      console.log(`[BG] 📋 Önceki denemeden kalan geri bildirimler dikkate alınarak baştan yazım (Rewrite)...`);
                      enrichedContent = `⚠️⚠️⚠️ ÖNCEKİ DENEMEDE TESPİT EDİLEN EKSİKLER VE HATALAR:\nLütfen aşağıdaki geri bildirimleri dikkate alarak ders notunu baştan, organik bir akışla tekrar yaz:\n\n${feedbackItems.join("\n\n")}\n\n---\n\n${section.rawContent}`;
                    }
                  }
                }

                if (!isSmartInject) {
                  notes = await generateCourseNotes(
                    enrichedContent, section.title, course.name, course.userLevel,
                    aiMode, course.geminiFileUri || undefined, section.pageStart, section.pageEnd
                  )
                }

                console.log(`[BG] ✅ Notes generated/injected: ${notes.length} chars`)
                await new Promise(r => setTimeout(r, 8000)) // Rate limit koruması

                // Doğrulama yap - KÖKLÜ VE TUTARLI ÇÖZÜM: Sayfa çakışmalarını ve mükerrerlikleri tamamen engellemek için,
                // not doğrulama aşamasında PDF dosyasını (fileUri) pas geçerek SADECE veritabanındaki izole rawContent kullanılır!
                console.log(`[BG] Not Doğrulanıyor (Deneme #${vAttempt})...`)
                try { await prisma.section.update({ where: { id: section.id }, data: { verificationIssues: JSON.stringify({ currentMicroPhase: `${sIdx + 1}/${totalSections}. Bölüm Kalite Kontrolörü Tarafından Denetleniyor (Tur #${vAttempt})` }) } }) } catch { }
                const { verifyNotesAgainstSource } = await import("@/lib/ai-service")
                const verification = await verifyNotesAgainstSource(
                  section.rawContent, notes, section.title,
                  undefined, section.pageStart, section.pageEnd
                )

                currentScore = verification.score

                // En yüksek başarılı doğrulama skorunu ve notlarını koru
                if (currentScore > bestScore) {
                  bestScore = currentScore
                  bestNotes = notes
                  console.log(`[BG] 🏆 Yeni en yüksek skor: %${bestScore}`)
                }

                // KONTROLÖR ÇELİŞKİ DENETÇİSİ (Consistency Check)
                // Kontrolör "hata/eksik var" deyip puanı 100 döndürürse, çelişkiyi tespit edip puanı
                // dürüst bir şekilde eksik ve hata sayısına oranla düşürüyoruz.
                const hasCriticalFeedback = verification.missingTopics.length > 0 || verification.issues.length > 0;
                if (currentScore === 100 && hasCriticalFeedback) {
                  // Eksik ve hata sayısına göre matematiksel düşüş
                  const penaltyCount = verification.missingTopics.length + verification.issues.length;
                  const rawPenalty = penaltyCount * 5; // Her tespit -5 puan
                  currentScore = Math.max(50, 100 - rawPenalty);
                  verification.score = currentScore;
                  console.log(`[BG] ⚠️ KONTROLÖR ÇELİŞKİSİ: Model 100 verdi ama ${penaltyCount} hata/eksik buldu. Dürüst puan: %${currentScore}`);
                }

                // Kontrolörün yapısal skor değerini kaydet (SmartInject routing kararı için)
                const kontrolorStructuralScore = verification.score;

                lastVerification = verification

                const historyEntry = {
                  attempt: vAttempt,
                  score: verification.score,
                  missingTopics: verification.missingTopics || [],
                  issues: verification.issues || [],
                  suggestions: verification.suggestions || [],
                  isSmartInject: isSmartInject
                }
                attemptHistory.push(historyEntry)

                // CANLI RAPOR GÜNCELLEMESİ
                try {
                  await prisma.section.update({
                    where: { id: section.id },
                    data: {
                      verificationScore: currentScore,
                      ...(verification.score === 100 ? { notes: notes || null } : {}),
                      verificationIssues: JSON.stringify({
                        missingTopics: lastVerification.missingTopics || [],
                        issues: lastVerification.issues || [],
                        suggestions: lastVerification.suggestions || [],
                        currentAttempt: vAttempt,
                        isCheckingAgain: currentScore < 95 && vAttempt < 5,
                        attemptHistory: attemptHistory
                      })
                    }
                  })
                } catch (dbErr) {
                  console.error("[BG_DB_ERROR] Canlı skor DB kaydı başarısız:", dbErr)
                }

                console.log(`[BG] 🔍 DOĞRULAMA (Deneme #${vAttempt}): ${section.title} → Skor: ${verification.score}/100`)
                if (verification.missingTopics.length > 0) {
                  console.log(`[BG] ⚠️ Eksik konular: ${verification.missingTopics.join(", ")}`)
                }
                if (verification.issues.length > 0) {
                  console.log(`[BG] 🔴 Hatalı bilgiler/sorunlar: ${verification.issues.join(", ")}`)
                }

                // Eğer skor tam 100 ise Müfettiş Derin Denetimine geç
                if (verification.score === 100) {
                  console.log(`[BG] 🎉 KONTROLÖR ONAYI (%100) — 4. Katman: Müfettiş Derin Denetimi (Deep Audit) Başlıyor...`)
                  try { await prisma.section.update({ where: { id: section.id }, data: { verificationIssues: JSON.stringify({ currentMicroPhase: `${sIdx + 1}/${totalSections}. Bölüme 3'lü Paketler Halinde Müfettiş Çapraz Denetimi Yapılıyor...` }) } }) } catch { }

                  // 1. Tüm konuları doğrudan üretilmiş nottaki başlıklardan (## veya ###) Regex ile çıkar (API tasarrufu!)
                  const sectionTopics = currentContent
                    .split('\n')
                    .filter(line => line.trim().startsWith('## ') || line.trim().startsWith('### '))
                    .map(line => line.replace(/^#+\s*/, '').replace(/\[.*?\]/g, '').trim())
                    .filter(line => line.length > 3 && !line.includes('Bölüm Özeti') && !line.includes('Kendini Test Et') && !line.includes('Ekstra Dikkat'));

                  if (sectionTopics.length > 0) {
                    // 2. 3'erli paketlere böl
                    const packages: string[][] = []
                    for (let i = 0; i < sectionTopics.length; i += 3) {
                      packages.push(sectionTopics.slice(i, i + 3))
                    }

                    let overallPassed = true
                    const allMissingDetails: string[] = []
                    const allContradictions: string[] = []
                    const allFindings: Array<{ description: string; severity: string; type: string }> = []

                    console.log(`[BG] 📦 Toplam Paket Sayısı: ${packages.length} paket denetlenecek.`)

                    let packIdx = 1
                    for (const pack of packages) {
                      console.log(`[BG] 👉 [Paket ${packIdx}/${packages.length}] Müfettiş inceliyor...`)
                      await new Promise(r => setTimeout(r, 4000))

                      try {
                        const auditResult = await auditNotesAgainstSourceSpecific(
                          section.rawContent,
                          notes,
                          section.title,
                          pack,
                          undefined,
                          section.pageStart,
                          section.pageEnd
                        )

                        if (!auditResult.passed) {
                          overallPassed = false
                          console.warn(`[BG] ❌ [Paket ${packIdx} BAŞARISIZ]`)
                          if (auditResult.missingDetails?.length) allMissingDetails.push(...auditResult.missingDetails)
                          if (auditResult.contradictions?.length) allContradictions.push(...auditResult.contradictions)
                        } else {
                          console.log(`[BG] ✅ [Paket ${packIdx} BAŞARILI]`)
                        }

                        // Severity-weighted findings biriktir
                        if (auditResult.findings?.length) {
                          allFindings.push(...auditResult.findings)
                        }
                      } catch (err: any) {
                        overallPassed = false
                        allMissingDetails.push(`[Paket ${packIdx} Hatası] ${err.message}`)
                        allFindings.push({ description: `Paket ${packIdx} API Hatası: ${err.message}`, severity: "CRITICAL", type: "missing" })
                      }
                      packIdx++
                    }

                    if (!overallPassed) {
                      // ==================== DÜRÜST PUANLAMA MOTORU (Severity-Weighted True Scoring) ====================
                      // Her bulgunun ağırlığına göre puanı DÜRÜSTÇE hesapla.
                      const SEVERITY_PENALTIES: Record<string, number> = { CRITICAL: 10, MEDIUM: 5, LOW: 2 }
                      let totalPenalty = 0
                      let criticalCount = 0
                      let mediumCount = 0
                      let lowCount = 0

                      for (const finding of allFindings) {
                        const penalty = SEVERITY_PENALTIES[finding.severity] || 5
                        totalPenalty += penalty
                        if (finding.severity === "CRITICAL") criticalCount++
                        else if (finding.severity === "MEDIUM") mediumCount++
                        else lowCount++
                      }

                      // Kontrolör 100 vermişti. Müfettiş bulgularına göre GERÇEK skoru hesapla.
                      const trueScore = Math.max(30, 100 - totalPenalty) // 30'un altına düşmesin (not var sonuçta)
                      currentScore = trueScore
                      verification.score = trueScore

                      // FIX #5: Müfettiş en üst otoritedir — bestScore'u da düzelt
                      // Kontrolör 100 dedi ama müfettiş düşürdü. bestScore=100 kalırsa
                      // bir sonraki kota hatasında yanlış geri yüklenir.
                      bestScore = trueScore
                      bestNotes = notes
                      console.log(`[BG] 🏆 Müfettiş düzeltmesi sonrası bestScore güncellendi: %${bestScore}`)

                      console.log(`[BG] ⛔ MÜFETTİŞ DENETİMİ SONUCU:`)
                      console.log(`[BG]   → KRİTİK: ${criticalCount} bulgu (x10 puan)`)
                      console.log(`[BG]   → ORTA: ${mediumCount} bulgu (x5 puan)`)
                      console.log(`[BG]   → DÜŞÜK: ${lowCount} bulgu (x2 puan)`)
                      console.log(`[BG]   → Toplam Ceza: -${totalPenalty} puan`)
                      console.log(`[BG]   → DÜRÜST PUAN: %${trueScore} (Kontrolör: %100 → Müfettiş düzeltmesi: %${trueScore})`)

                      // Müfettişin bulgularını lastVerification'a ekle ki sonraki üretimde Yazar bunları düzeltsin
                      lastVerification.missingTopics.push(...allMissingDetails.map(d => `[MÜFETTİŞ EKSİĞİ] ${d}`))
                      lastVerification.issues.push(...allContradictions.map(c => `[MÜFETTİŞ HATASI] ${c}`))

                      // UI Bug Fix: Update the history entry with the true lowered score from Deep Audit
                      if (historyEntry) {
                        historyEntry.score = trueScore;
                        historyEntry.missingTopics = [...lastVerification.missingTopics];
                        historyEntry.issues = [...lastVerification.issues];
                      }

                      // DB Live Update for Inspector Failure — DÜRÜST SKOR ile
                      try {
                        await prisma.section.update({
                          where: { id: section.id },
                          data: {
                            verificationScore: trueScore,
                            verificationIssues: JSON.stringify({
                              missingTopics: lastVerification.missingTopics,
                              issues: lastVerification.issues,
                              suggestions: lastVerification.suggestions,
                              currentAttempt: vAttempt,
                              isCheckingAgain: true,
                              attemptHistory: attemptHistory,
                              inspectorFailed: true,
                              inspectorFindings: allFindings // Ağırlıklı bulgu detayları
                            })
                          }
                        })
                      } catch (e) { }

                      // "Kaliteden taviz yok" - Akıllı Çıkış stratejisi tamamen iptal edildi.
                      // Notun %100 kusursuz olması ZORUNLUDUR. 96 veya 99 alınsa dahi,
                      // sistem eksikleri Smart Inject ile kapatmaya çalışacaktır.
                    }
                  } else {
                    console.log(`[BG] ⚠️ Konu çıkarılamadı, Müfettiş denetimi atlanıyor.`)
                  }

                  if (verification.score === 100) {
                    console.log(`[BG] 🎉 KALİTE ONAYLANDI (%100) — Hem Kontrolör Hem Müfettiş Kusursuz Onay Verdi!`)
                    notesAttemptSuccess = true
                    break
                  }
                }

                // ==================== AKILLI YÖNLENDİRME (Smart Routing) ====================
                // Döngünün bir sonraki iterasyonunda ne yapılacağına karar veren mantık.
                // Not: SmartInject kararı artık sahte "99" şifresine değil,
                // Kontrolörün yapısal değerlendirmesine (kontrolorStructuralScore) dayanır.
                // Bu değer döngünün başındaki (vAttempt > 1) koşulunda lastVerification.score olarak okunur.

                if (vAttempt < 5) {
                  console.log(`[BG] ⛔ Skor mükemmel değil (%${verification.score}), 10sn beklenip tekrar denenecek...`)
                  await new Promise(r => setTimeout(r, 10000))
                }
              } catch (notesErr: any) {
                console.error(`[BG] ❌ Not üretim/doğrulama denemesi #${vAttempt} başarısız:`, notesErr.message)

                // FIX #4: Kota hatası mı yoksa gerçek hata mı?
                const isQuotaErr = notesErr.message?.includes("kota") ||
                  notesErr.message?.includes("quota") ||
                  notesErr.message?.includes("429") ||
                  notesErr.message?.includes("RESOURCE_EXHAUSTED")

                if (isQuotaErr && quotaFailures < MAX_QUOTA_FAILURES) {
                  quotaFailures++
                  vAttempt-- // Kota hatası gerçek deneme hakkını YEMEMELİ
                  console.log(`[BG] ⏳ Kota hatası (${quotaFailures}/${MAX_QUOTA_FAILURES})! Bu deneme sayılmıyor, 60sn bekleniyor...`)
                  await new Promise(r => setTimeout(r, 60000))
                } else if (isQuotaErr) {
                  console.log(`[BG] ⛔ Kota hatası limiti aşıldı (${MAX_QUOTA_FAILURES}). Mevcut en iyi skorla devam ediliyor.`)
                }

                // KRİTİK: Kota hatası gibi geçici hatalarda önceki en yüksek skoru koru!
                if (bestScore > 0) {
                  currentScore = bestScore
                  notes = bestNotes
                  console.log(`[BG] 🛡️ Geçici hata! En iyi skor korunuyor: %${bestScore}`)
                }

                // Hata geçmişine kaydet
                attemptHistory.push({
                  attempt: vAttempt,
                  score: 0,
                  missingTopics: [],
                  issues: [isQuotaErr ? "Kota hatası — deneme sayılmadı" : "Doğrulama yapılamadı"],
                  suggestions: []
                })

                if (vAttempt === 5 && !notes) throw notesErr
              }
            } // End of quality loop

            // KULLANICI KESİN EMRİ: "Sistem pes etmeyecek! Kalitesiz not kaydedilmeyecek!"
            // Eğer 15 denemenin sonunda bile hala 85'in altında kaldıysa, KESİNLİKLE sisteme kaydetme.
            if (currentScore < 85) {
              console.error(`[BG] ❌ 🚨 KRİTİK İPTAL: ${MAX_RETRIES} deneme yapıldı ama kalite %${currentScore}'da kaldı. Kötü not kaydetmemek için işlem REDDEDİLDİ ve durduruldu!`);
              throw new Error(`KALİTE BARAJI AŞILAMADI! En iyi skor: %${currentScore}. Kusursuz not istendiği için kirli veri veritabanına kaydedilmedi.`);
            }
          } // End of if (!notesAttemptSuccess)

          // ==================== DOĞRULANMIŞ NOT ÜZERİNDEN DERS ÖĞELERİNİ ÜRETME ====================

          let flashcards: any[] = []
          let questions: any[] = []
          let analysis: any = {}
          let finalTitle = section.title
          let requiresQuestions = true

          if (!notesAttemptSuccess && (!notes || notes.length < 500)) {
            console.warn(`[BG] ⚠️ [${section.title}] Bölüm tam onaylanmadı ve notlar çok kısa/eksik. Soru ve flashcard üretimi atlanıyor...`);
          } else {
            console.log(`[BG] Onaylanmış not üzerinden Flashcard ve Sorular üretiliyor...`)
            // SADECE ONAYLANMIŞ NOTLARI KULLAN Kİ DIŞARIDAN BİLGİ GELMESİN
            const finalContent = notes || section.rawContent;
            try { await prisma.section.update({ where: { id: section.id }, data: { verificationIssues: JSON.stringify({ currentMicroPhase: `${sIdx + 1}/${totalSections}. Bölüm Flashcard Kartları (Bilgi Kartları) Oluşturuluyor...` }) } }) } catch { }

            // Flashcard'ları üret (2 kere deneme şansı)
            for (let fAttempt = 1; fAttempt <= 2; fAttempt++) {
              try {
                flashcards = await generateFlashcards(finalContent, section.title, course.name, course.userLevel, aiMode, undefined, section.pageStart, section.pageEnd)
                console.log(`[BG] ✅ Flashcards: ${flashcards.length}`)
                break
              } catch (e: any) {
                console.error(`[BG] ⚠️ Flashcard üretimi ${fAttempt}. denemede başarısız:`, e.message)
                if (fAttempt === 3) console.error(`[BG] ❌ Flashcard üretimi atlandı.`)
                else await new Promise(r => setTimeout(r, 10000))
              }
            }
            await new Promise(r => setTimeout(r, 15000))

            // Gereksiz API çağrısını önlemek için analyzeSectionContent kaldırıldı. Mevcut not başlıkları kullanılıyor.
            const analysisTopics = finalContent
              .split('\n')
              .filter(line => line.trim().startsWith('## ') || line.trim().startsWith('### '))
              .map(line => line.replace(/^#+\s*/, '').replace(/\[.*?\]/g, '').trim())
              .filter(line => line.length > 3 && !line.includes('Bölüm Özeti') && !line.includes('Kendini Test Et') && !line.includes('Ekstra Dikkat'));

            analysis = { topics: analysisTopics, level: "advanced" }
            await new Promise(r => setTimeout(r, 15000))

            requiresQuestions = analysis?.requiresQuestions !== false; // Default to true if missing

            if (!requiresQuestions) {
              console.log(`[BG] 🧠 COGNITIVE ROUTING: Bu bölüm sadece terim/kısaltma içeriyor. Soru üretimi atlanıyor (requiresQuestions: false).`);
            } else {
              try { await prisma.section.update({ where: { id: section.id }, data: { verificationIssues: JSON.stringify({ currentMicroPhase: `${sIdx + 1}/${totalSections}. Bölüm Soru Havuzu Oluşturuluyor...` }) } }) } catch { }
              for (let qAttempt = 1; qAttempt <= 2; qAttempt++) {
                try {
                  questions = await generateQuestions(finalContent, section.title, course.name, course.userLevel, aiMode, undefined, section.pageStart, section.pageEnd, section.importance || undefined)
                  console.log(`[BG] ✅ Questions: ${questions.length}`)
                  break
                } catch (e: any) {
                  console.error(`[BG] ⚠️ Soru üretimi ${qAttempt}. denemede başarısız:`, e.message)
                  if (qAttempt === 3) console.error(`[BG] ❌ Soru üretimi atlandı.`)
                  else await new Promise(r => setTimeout(r, 10000))
                }
              }
              await new Promise(r => setTimeout(r, 15000))
            }

            // Başlığı iyileştir
            const suggestedTitle = (analysis as any).suggestedTitle
            if (suggestedTitle && suggestedTitle.length > 3 && suggestedTitle.length < 100) {
              const isGeneric = section.title.startsWith("Bölüm İçeriği") ||
                section.title.startsWith("Giriş ve Genel") ||
                /^(Bölüm|Sayfa)\s*\d/i.test(section.title)
              if (isGeneric) {
                finalTitle = suggestedTitle
                console.log(`[BG] 📝 Başlık güncellendi: "${section.title}" → "${finalTitle}"`)
              }
            }
          }

          const detectedModule = (analysis as any).module || null

          // FIX #2: Soru/flashcard eksikliğini tespit et ve sessizce geçme
          const missingContent: string[] = []
          if (flashcards.length === 0 && notes && notes.length > 500) {
            missingContent.push("flashcards")
            console.error(`[BG] 🚨 [${finalTitle}] UYARI: Flashcard üretimi TAMAMEN BAŞARISIZ! Bölüm eksik olarak işaretleniyor.`)
          }
          if (requiresQuestions && questions.length === 0 && notes && notes.length > 500) {
            missingContent.push("questions")
            console.error(`[BG] 🚨 [${finalTitle}] UYARI: Soru üretimi TAMAMEN BAŞARISIZ! Bölüm eksik olarak işaretleniyor.`)
          }

          // Bölüm onay durumu: Notlar kusursuz olsa bile soru/flashcard yoksa tam onay verilmez
          let isSectionApproved = notesAttemptSuccess
          if (missingContent.length > 0) {
            isSectionApproved = false // Eksik içerik varsa onaylama!
            console.error(`[BG] ⛔ [${finalTitle}] Eksik içerik nedeniyle bölüm ONAYLANMADI: ${missingContent.join(", ")}`)
          }

          // FIX #3: Importance null kalmasını engelle
          const resolvedImportance = analysis.importance || section.importance || "Medium"

          // Veritabanı kayıtlarını oluştur
          await prisma.section.update({
            where: { id: section.id },
            data: {
              title: finalTitle,
              summary: analysis.summary || "",
              notes: notes || null,
              importance: resolvedImportance,
              topics: JSON.stringify(analysis.topics || []),
              module: detectedModule,
              processed: isSectionApproved,
              verificationScore: currentScore,
              verificationIssues: lastVerification ? JSON.stringify({
                missingTopics: lastVerification.missingTopics,
                issues: lastVerification.issues,
                suggestions: lastVerification.suggestions,
                attemptHistory: attemptHistory,
                ...(missingContent.length > 0 ? { missingContent } : {})
              }) : null
            }
          })

          // KISALTMALAR Sözlük Çıkarımı (Glossary Extraction)
          if (finalTitle.toUpperCase().includes("KISALTMALAR") && notes) {
            console.log(`[BG] 📚 "KISALTMALAR" bölümü algılandı. Sözlük (Glossary) çıkarılıyor...`)
            const dict: Record<string, string> = {}
            const lines = notes.split('\n')
            for (const line of lines) {
              const cleanLine = line.trim()
              // Olası formatlar: 
              // * **ABBR:** Definition
              // **ABBR:** Definition
              const match = cleanLine.match(/^(?:\*\s+)?\*\*([^:]+):\*\*\s*(.+)$/)
              if (match) {
                dict[match[1].trim()] = match[2].trim()
              }
            }
            if (Object.keys(dict).length > 0) {
              try {
                await prisma.course.update({
                  where: { id: course.id },
                  data: { glossary: JSON.stringify(dict) }
                })
                console.log(`[BG] ✅ ${Object.keys(dict).length} adet kısaltma Course.glossary alanına kaydedildi.`)
              } catch (e) {
                console.error(`[BG] ⛔ Glossary kaydetme hatası:`, e)
              }
            }
          }

          // FIX #1: Mükerrer flashcard koruması — aynı front metni varsa ekleme
          const existingCards = await prisma.flashcard.findMany({
            where: { sectionId: section.id },
            select: { front: true }
          })
          const existingFronts = new Set(existingCards.map(c => c.front.trim().toLowerCase()))
          let dedupSkipped = 0
          for (const card of flashcards) {
            const normalizedFront = card.front.trim().toLowerCase()
            if (existingFronts.has(normalizedFront)) {
              dedupSkipped++
              continue // Mükerrer — atla
            }
            existingFronts.add(normalizedFront)
            try { await prisma.flashcard.create({ data: { courseId: course.id, sectionId: section.id, front: card.front, back: card.back, difficulty: card.difficulty || "medium" } }) } catch { }
          }
          if (dedupSkipped > 0) {
            console.log(`[BG] 🔄 ${dedupSkipped} mükerrer flashcard atlandı (dedup koruması).`)
          }

          // Mükerrer soru koruması — aynı soru metni varsa ekleme
          const existingQuestions = await prisma.question.findMany({
            where: { sectionId: section.id },
            select: { text: true }
          })
          const existingTexts = new Set(existingQuestions.map(q => q.text.trim().toLowerCase()))
          for (const q of questions) {
            const normalizedText = q.text.trim().toLowerCase()
            if (existingTexts.has(normalizedText)) continue
            existingTexts.add(normalizedText)
            try { await prisma.question.create({ data: { courseId: course.id, sectionId: section.id, text: q.text, options: JSON.stringify(q.options), correct: q.correct, explanation: q.explanation, difficulty: q.difficulty || "medium", module: detectedModule } }) } catch { }
          }

          console.log(`[BG] ✅ SAVED: ${finalTitle} → ${flashcards.length} cards, ${questions.length} questions. Skor: ${currentScore}/100`)

          // ==================== ANA TABLO CANLILIK SİNYALİ GÜNCELLEMESİ (15dk timeout engelleme) ====================
          await prisma.course.update({
            where: { id: course.id },
            data: { updatedAt: new Date() }
          })
          console.log(`[BG] 💓 Ders canlılık sinyali (updatedAt) güncellendi.`)

          success = true

          // Yeni Akış Kontrolü: 
          // Akıllı Çıkış (notesAttemptSuccess) onay verdiyse işlem durmadan sonraki bölüme geçer.
          // Eğer 5 denemede de onay alınamadıysa (notesAttemptSuccess === false), kullanıcı onayı için durdurur.
          const needsUserApproval = !notesAttemptSuccess;
          if (needsUserApproval) {
            console.log(`[BG] ⚠️ [${finalTitle}] 5 kalite döngüsü sonrasında dahi tam kusursuzluğa ulaşılamadı (%${currentScore})! İşlem kullanıcı onayı için durduruluyor.`)
            await prisma.course.update({
              where: { id: course.id },
              data: { status: "ready" }
            })
            isPausedForApproval = true
            break
          }
        } catch (aiError: any) {
          sectionRetries++
          console.error(`[BG_ERROR] [Deneme #${sectionRetries}/${maxSectionRetries}] ${section.title} işlenirken hata oluştu:`, aiError.message?.substring(0, 120))
        }
      }

      if (isPausedForApproval) {
        break
      }

      if (!success) {
        console.error(`[BG] 💀 FAILED: ${section.title} — Bölüm ${maxSectionRetries} deneme sonrasında da işlenemedi, işlem durduruluyor.`)
        hasCriticalError = true
        break
      }
      await new Promise(r => setTimeout(r, 2000))
    }

    if (isPausedForApproval) {
      console.log(`[BG] ⏸️ "${course.name}" işlemi kullanıcı onayı için beklemeye alındı (Durum: ready).`)
      return
    }

    if (hasCriticalError) {
      // Hata olduysa course status'u error yap
      await prisma.course.update({ where: { slug }, data: { status: "error" } })
      console.error(`[BG] ❌ "${course.name}" işlemi hata ile durduruldu.`)
      return
    }

    // Study Schedule
    if (course.examDate) {
      try {
        const allSec = await prisma.section.findMany({ where: { courseId: course.id }, orderBy: { order: "asc" } })
        const items = generateStudySchedule({ examDate: new Date(course.examDate), userLevel: course.userLevel as any, totalSections: allSec.length, sectionTitles: allSec.map(s => s.title), sectionIds: allSec.map(s => s.id) })
        for (const item of items) {
          await prisma.studyPlan.create({ data: { courseId: course.id, date: item.date.toISOString(), task: item.task, type: item.type, duration: item.duration.toString(), sectionIds: JSON.stringify(item.sectionIds), completed: false } })
        }
      } catch (e: any) { console.error("[SCHEDULE]", e.message) }
    }

    await prisma.course.update({ where: { slug }, data: { status: "ready" } })
    const stats = { flashcards: await prisma.flashcard.count({ where: { courseId: course.id } }), questions: await prisma.question.count({ where: { courseId: course.id } }) }
    console.log(`[BG] ✅ "${course.name}" tamamlandı! ${stats.flashcards} flashcard, ${stats.questions} soru`)
  } catch (fatalError: any) {
    console.error(`[BG_FATAL] "${course.name}" işlenirken kritik hata:`, fatalError.message)
    // Status'u 'uploaded' yap ki kullanıcı tekrar deneyebilsin, 'processing'de sonsuz kalmasın
    try { await prisma.course.update({ where: { slug }, data: { status: "uploaded" } }) } catch { }
  } finally {
    activeProcesses.delete(slug)
  }
}

// ==================== SECTION DETECTION ====================

function detectSections(pageTexts: string[], totalPages: number): DetectedSection[] {
  const sections: DetectedSection[] = []
  let currentSection: DetectedSection | null = null

  for (let pageIdx = 0; pageIdx < pageTexts.length; pageIdx++) {
    const text = pageTexts[pageIdx]
    const pageNum = pageIdx + 1

    // Skip very short pages (empty, table-only etc.)
    if (text.trim().length < 20) continue

    // Check for section headers in first 500 chars of page
    const headerArea = text.substring(0, 500)
    let foundHeader = false

    for (const pattern of SECTION_PATTERNS) {
      const match = headerArea.match(pattern)
      if (match) {
        // Close previous section
        if (currentSection) {
          currentSection.pageEnd = pageNum - 1
          sections.push(currentSection)
        }

        // Start new section
        const title = (match[3] || match[2] || match[0]).trim().substring(0, 200)
        currentSection = {
          title,
          pageStart: pageNum,
          pageEnd: pageNum,
          content: text,
        }
        foundHeader = true
        break
      }
    }

    if (!foundHeader) {
      if (currentSection) {
        // Mevcut bölüme ekle
        currentSection.content += "\n\n" + text
      } else {
        // ⚠️ KRİTİK: İlk header'dan ÖNCE gelen sayfalar - "Giriş" bölümü oluştur
        // Bu sayede PDF'in ilk sayfaları ASLA atlanmaz!
        currentSection = {
          title: `Giriş ve Genel Bilgiler (Sayfa ${pageNum})`,
          pageStart: pageNum,
          pageEnd: pageNum,
          content: text,
        }
      }
    }
  }

  // Close last section
  if (currentSection) {
    currentSection.pageEnd = totalPages
    sections.push(currentSection)
  }

  // ========== KARAKTER BAZLI BÖLME ==========
  // Eğer bir bölüm MAX_CHUNK_CHARS'tan büyükse, alt bölümlere ayır
  const finalSections: DetectedSection[] = []

  for (const section of sections) {
    if (section.content.length <= MAX_CHUNK_CHARS) {
      // Başlık anlamsızsa (Giriş...), içerikten akıllı başlık çıkar
      finalSections.push({
        ...section,
        title: extractSmartTitle(section.content, section.title, section.pageStart, section.pageEnd),
      })
    } else {
      // Büyük bölümü alt-chunklara böl
      const subChunks = splitByCharLimit(section.content, MAX_CHUNK_CHARS)

      // Bu bölümün sayfalarının section.content içindeki konumlarını bulalım
      const sectionPages = pageTexts.slice(section.pageStart - 1, section.pageEnd)
      const pageOffsets: Array<{ pageNum: number; start: number; end: number }> = []
      let offset = 0
      for (let p = 0; p < sectionPages.length; p++) {
        const len = sectionPages[p].length
        pageOffsets.push({
          pageNum: section.pageStart + p,
          start: offset,
          end: offset + len
        })
        offset += len + 2 // for "\n\n"
      }

      let searchStart = 0
      for (let i = 0; i < subChunks.length; i++) {
        const subChunkText = subChunks[i]
        const chunkStart = section.content.indexOf(subChunkText, searchStart)
        const chunkEnd = chunkStart + subChunkText.length
        if (chunkStart >= 0) {
          searchStart = chunkStart + 1
        }

        let startPage = 0
        let endPage = 0
        for (const po of pageOffsets) {
          const isOverlapping = chunkStart <= po.end && po.start <= chunkEnd
          if (isOverlapping) {
            if (startPage === 0) startPage = po.pageNum
            endPage = po.pageNum
          }
        }

        if (startPage === 0) {
          startPage = Math.min(section.pageEnd, Math.max(section.pageStart, section.pageStart + Math.floor((i / subChunks.length) * (section.pageEnd - section.pageStart + 1))))
          endPage = startPage
        }

        const smartTitle = extractSmartTitle(subChunkText, section.title, startPage, endPage)
        finalSections.push({
          title: subChunks.length > 1
            ? `${smartTitle} (Bölüm ${i + 1}/${subChunks.length})`
            : smartTitle,
          pageStart: startPage,
          pageEnd: endPage,
          content: subChunkText,
        })
      }
    }
  }

  // If still no sections detected, create character-based chunks
  if (finalSections.length === 0) {
    const allText = pageTexts.join("\n\n")
    const chunks = splitByCharLimit(allText, MAX_CHUNK_CHARS)

    // Sayfaların allText içindeki yerlerini hesapla
    const pageOffsets: Array<{ pageNum: number; start: number; end: number }> = []
    let offset = 0
    for (let p = 0; p < pageTexts.length; p++) {
      const len = pageTexts[p].length
      pageOffsets.push({
        pageNum: p + 1,
        start: offset,
        end: offset + len
      })
      offset += len + 2 // for "\n\n"
    }

    let searchStart = 0
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i]
      const chunkStart = allText.indexOf(chunkText, searchStart)
      const chunkEnd = chunkStart + chunkText.length
      if (chunkStart >= 0) {
        searchStart = chunkStart + 1
      }

      let startPage = 0
      let endPage = 0

      for (const po of pageOffsets) {
        const isOverlapping = chunkStart <= po.end && po.start <= chunkEnd
        if (isOverlapping) {
          if (startPage === 0) startPage = po.pageNum
          endPage = po.pageNum
        }
      }

      if (startPage === 0) {
        startPage = Math.min(totalPages, Math.max(1, Math.ceil((i / chunks.length) * totalPages)))
        endPage = startPage
      }

      finalSections.push({
        title: `Bölüm ${i + 1} (Sayfa ${startPage}-${endPage})`,
        pageStart: startPage,
        pageEnd: endPage,
        content: chunkText,
      })
    }
  }

  // ==================== INGESTION GATEKEEPER / VERIFICATION FILTER ====================
  // Clean up any meaningless / tiny / question-titled sections permanently!
  const cleanedSections: DetectedSection[] = []

  for (let i = 0; i < finalSections.length; i++) {
    const sec = finalSections[i]

    // Check if title looks like a multiple choice question option or question header
    // e.g. "D) SHA - 256" or starts with "A) ", "Soru 1: " etc.
    const isTrapTitle = /^[A-E]\)\s+/i.test(sec.title) ||
      /^[0-9]+\.\s*Soru/i.test(sec.title) ||
      /^[0-9]+\s*\)/.test(sec.title) ||
      sec.title.toLowerCase().includes("cevap:") ||
      sec.title.trim().length <= 3

    // Check if the section is too short (< 3 pages) and could be a visual transition gap
    const pageCount = sec.pageEnd - sec.pageStart + 1
    const isTinySection = pageCount < 3

    // If it's a trap title OR it's a tiny section containing mostly test keywords, merge it!
    const isTestTransition = isTrapTitle || (isTinySection && (
      sec.content.toLowerCase().includes("cevap:") ||
      sec.content.toLowerCase().includes("soru 1") ||
      sec.content.toLowerCase().includes("aşağıdakilerden hangisi")
    ))

    if (isTestTransition && cleanedSections.length > 0) {
      // Merge into the previous section!
      const prev = cleanedSections[cleanedSections.length - 1]
      console.log(`[GATEKEEPER] Merging meaningless transition section "${sec.title}" (Pages ${sec.pageStart}-${sec.pageEnd}) into previous section "${prev.title}"`)
      prev.pageEnd = Math.max(prev.pageEnd, sec.pageEnd)
      prev.content += `\n\n--- ÜNİTE DEĞERLENDİRME SORULARI (Ek) ---\n${sec.content}`
    } else {
      cleanedSections.push(sec)
    }
  }

  return cleanedSections
}

// Metni KONU SINIRLARINDA karakter limitine göre böl
// Öncelik: 1. Başlık sınırları 2. Paragraf sınırları 3. Asla konu ortasından kesmez
function splitByCharLimit(text: string, limit: number): string[] {
  const chunks: string[] = []

  // Metni başlık sınırlarında bölmeye çalış
  // Başlık pattern'leri: BÜYÜK HARFLI satırlar, numaralı başlıklar, alt başlıklar
  const headerPattern = /\n(?=(?:[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ\s0-9.()-]{8,80}\n)|\d+\.\s+[A-ZÇĞİÖŞÜ])/g
  const topicSegments: string[] = []
  let lastIdx = 0
  let match

  while ((match = headerPattern.exec(text)) !== null) {
    if (match.index > lastIdx) {
      topicSegments.push(text.substring(lastIdx, match.index))
    }
    lastIdx = match.index + 1 // +1 to skip the \n
  }
  if (lastIdx < text.length) {
    topicSegments.push(text.substring(lastIdx))
  }

  // Segmentleri birleştirirken limiti aşmamaya dikkat et
  let current = ""
  for (const segment of topicSegments) {
    if (current.length + segment.length > limit && current.length > 0) {
      chunks.push(current.trim())
      current = segment
    } else {
      current += (current ? "\n" : "") + segment
    }
  }
  if (current.trim()) {
    chunks.push(current.trim())
  }

  // Eğer başlık bazlı bölme başarısız olduysa, paragraf sınırlarında kes
  if (chunks.length <= 1 && text.length > limit) {
    chunks.length = 0
    const paragraphs = text.split(/\n\n+/)
    current = ""
    for (const para of paragraphs) {
      if (current.length + para.length + 2 > limit && current.length > 0) {
        chunks.push(current.trim())
        current = para
      } else {
        current += (current ? "\n\n" : "") + para
      }
    }
    if (current.trim()) {
      chunks.push(current.trim())
    }
  }

  // Son çare: hiç bölünemediyse zorla böl (ama bu duruma asla düşmemeli)
  if (chunks.length === 0 && text.length > 0) {
    for (let i = 0; i < text.length; i += limit) {
      chunks.push(text.substring(i, i + limit))
    }
  }

  return chunks
}

// Boşluklu harfleri düzelt (yalnızca çok bariz olanlar için)
function fixSpacedText(str: string) {
  let fixed = str.replace(/(?:^|\s)([A-ZÇĞİÖŞÜ])(?:\s+([A-ZÇĞİÖŞÜ])){2,}(?=\s|$)/g, (match) => {
    return match.replace(/\s+/g, '');
  });
  return fixed.trim();
}

// İçerikten akıllı başlık çıkar
function extractSmartTitle(content: string, fallbackTitle: string, pageStart: number, pageEnd: number): string {
  // İlk birkaç satırı kontrol et
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length === 0) return fallbackTitle;

  // İlk 10 satırda başlık arayalım
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];

    // Klasik "1. BÖLÜM: BAŞLIK" formları
    const match = line.match(/^(?:BÖLÜM|KISIM|ÜNİTE)\s*\d+\s*[:.-]?\s*(.+)/i) ||
      line.match(/^\d+\.\s*BÖLÜM\s*[:.-]?\s*(.+)/i) ||
      line.match(/^\d+\.\s*([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü\s]{5,60})$/);

    if (match && match[1] && match[1].length > 3) {
      return fixSpacedText(match[1]);
    }

    // Tamamen büyük harfli, 10-60 karakter arası anlamlı satırları başlık kabul et
    if (/^[A-ZÇĞİÖŞÜ\s0-9.()-]+$/.test(line) && line.length > 8 && line.length < 80) {
      // İçinde en az 2 kelime varsa
      if (line.split(/\s+/).length >= 2) {
        return fixSpacedText(line);
      }
    }
  }

  // Eğer `fallbackTitle` (regex'ten gelen) düzgünse onu kullan
  if (fallbackTitle && fallbackTitle.length > 3 && fallbackTitle.length < 100 && !fallbackTitle.startsWith("Giriş")) {
    return fixSpacedText(fallbackTitle);
  }

  return `Bölüm İçeriği (Sayfa ${pageStart}-${pageEnd})`;
}
