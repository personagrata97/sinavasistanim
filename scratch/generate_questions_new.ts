export async function generateQuestions(
  content: string,
  sectionTitle: string,
  courseName: string,
  userLevel: string = "beginner",
  aiMode: string = "general",
  fileUri?: string,
  pageStart?: number,
  pageEnd?: number,
  importance?: string,
): Promise<Array<{ text: string; options: string[]; correct: string; explanation: string; difficulty: string }>> {
  // Chunking mantığı devreye giriyor!
  const chunkThreshold = 15000;
  const isChunked = content.length > chunkThreshold;
  const chunks = isChunked ? splitContentIntoChunks(content, chunkThreshold) : [content];
  
  console.log(`[QUESTION_GEN] Metin ${chunks.length} parçaya bölündü (Toplam Karakter: ${content.length})`);

  let allQuestions: any[] = [];
  
  // Paralel işlem API'yi boğabilir, bu yüzden sıralı (sequential) gidiyoruz
  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i];
    console.log(`[QUESTION_GEN] Parça ${i+1}/${chunks.length} işleniyor... (Karakter: ${chunkContent.length})`);

    const levelQuestionStyle: Record<string, string> = {
      beginner: `
        - Zorluk dağılımı: %20 kolay, %50 orta, %30 zor
        - Kolay sorularda bile çeldirici şıklar olsun
        - Orta sorularda vaka senaryoları kullan
        - Açıklamalarda her yanlış şıkkın NEDEN yanlış olduğunu detaylı açıkla
      `,
      intermediate: `
        - Zorluk dağılımı: %10 kolay, %40 orta, %50 zor
        - Vaka tabanlı senaryolar ağırlıklı olsun
        - Çeldiriciler birbirine ÇOK benzesin, ince farkları ölçsün
        - Açıklamalarda her şıkkı teker teker analiz et
      `,
      advanced: `
        - Zorluk dağılımı: %5 kolay, %25 orta, %70 zor
        - Ağırlıklı vaka, hesaplama ve çok ince detay soruları
        - Şıklar arasında minimal fark olsun, dikkatsiz olanı yanıltsın
        - Açıklamalarda mevzuat detaylarına referans ver
      `,
    }

    const prompt = `
${getExamIntelligence(aiMode)}

DERS: ${courseName}
BÖLÜM: "${sectionTitle}"
${fileUri ? `SAYFA ARALIĞI: Ekteki dosyanın ${pageStart} ile ${pageEnd}. sayfaları aralığı.` : ""}

SEVİYE TALİMATLARI: 
${levelQuestionStyle[userLevel] || levelQuestionStyle.beginner}

SORU KURALLARI:
- 🚫 KESİNLİKLE YASAK: Belgenin yapısı, başlık numaraları veya içindekiler tablosuyla ilgili soru SORMA. Sadece gerçek finansal, teknik ve mevzuat bilgisini ölç.
- 🚨 ÖLÜMCÜL HATA VE KESİN İPTAL SEBEBİ: Sorularda, şıklarda ve açıklamalarda "Kaynak metne göre", "Yukarıdaki bilgilere göre", "Ders notlarında", "Metinde belirtilen" GİBİ İFADELER ASLA VE ASLA KULLANILAMAZ! Soruyu sanki tek başına, bağımsız, profesyonel bir ÖSYM sınav sorusuymuş gibi doğrudan sor. Hiçbir şekilde öğrenciye "bu sorunun kaynağı bir metin/PDF" hissi YARATILMAYACAK.
- **ASLA KENDİ KAFANDAN SINAV TAKTİĞİ VEYA YORUM UYDURMA!** "Sınavda doğrudan şu terimler sorulmaktadır", "Buraya çok dikkat edin", "Bu konu çok önemlidir" gibi HOCALIK TASLAYAN veya kaynak metinde (PDF'te) olmayan hiçbir yönlendirici/abartı cümleyi **ASLA KULLANMA.**
- Doğru cevap şık harfi olsun (A, B, C, D veya E)
- Resmi terimleri AYNEN kullan (pay, tahvil, izahname vb.)
- Çeldirici şıklar gerçekçi olsun ve birbirine çok benzesin
- Metinde formül/rakam/oran varsa EN AZ 2-3 adet SAYISAL/HESAPLAMA sorusu ekle
- Metinde tarih/süre/limit varsa bunlarla ilgili soru sor
- 🇹🇷 DİL KALİTESİ: Türkçe dil bilgisi, kelime dizilimi ve akıcılığa %100 uy. İngilizce'den doğrudan çevrilmiş gibi duran yapay veya ters yapılar ("Özeti [Konu]", "Sözlüğü [Konu]", "Notları [Konu]") KESİNLİKLE kullanma. Her zaman doğal ve düzgün bir Türkçe ile akıcı cümleler kur.

DİNAMİK ÜRETİM: Bu metin ana "${sectionTitle}" bölümünün bir PARÇASIDIR. Lütfen bu metnin BİLGİ YOĞUNLUĞUNU analiz et. Eğer metin kurallar, cezalar, oranlar ve tanımlarla doluysa EN AZ 3-5 adet kaliteli sınav sorusu oluştur. Eğer metin sadece giriş, önsöz veya yüzeysel bilgilerden ibaretse sadece 1-2 adet temel soru oluştur. Kaliteden taviz verme.

SORU TİPLERİ VE DAĞILIMI (GERÇEK ÖSYM/SPL FORMATI):
Ürettiğin soruların en az %40'ı "ÖNCÜLLÜ (I, II, III)" formatında OLMALIDIR. Bu kesin bir kuraldır.
1. Öncüllü Soru (ZORUNLU - %40): 
   I. [Birinci ifade]
   II. [İkinci ifade]
   III. [Üçüncü ifade]
   Soru Kökü: Yukarıdakilerden hangisi/hangileri doğrudur? (Şıklar: A) Yalnız I, B) Yalnız II, C) I ve II, D) I ve III, E) I, II ve III)
2. Kurumsal Vaka Tabanlı: ŞAHIS İSİMLERİ (Ahmet, Mehmet, Ayşe vb.) KESİNLİKLE YASAKTIR! Vaka senaryolarında SADECE tüzel kişiler ("X Aracı Kurumu", "Y Portföy Yönetim Şirketi") veya genel unvanlar ("Kurumun Uyum Görevlisi", "İç Denetim Uzmanı") kullanılmalıdır.
3. Ters Köşe Soru: "Aşağıdakilerden hangisi YANLIŞTIR / DEĞİLDİR / İSTİSNADIR?"
4. Kavramsal Çeldirici: Şıkların birbirine %90 benzediği, ince detayları ölçen doğrudan bilgi sorusu.
5. Hesaplama/Süre: Metinde rakam, gün, süre veya oran varsa KESİNLİKLE bunları ölç.

VARYASYON KURALI (ÇOK ÖNEMLİ):
Aynı konuyu FARKLI açılardan test eden sorular üret. Örneğin:
- Soru 1: Tanım sorusu
- Soru 2: Hesaplama/Uygulama sorusu
- Soru 3: İstisna/Özel durum sorusu
- Soru 4: "Aşağıdakilerden hangisi X hakkında YANLIŞTIR?" (ters soru)
Böylece aynı bilgi 4 farklı şekilde test edilir ve kullanıcı "aynı soru" görmez.

⚠️⚠️⚠️ AÇIKLAMA FORMATI — KIRMIZI ÇİZGİ — ASLA ATLANMAYACAK:
Her sorunun explanation alanında TÜM ŞIKLARI TEK TEK açıklayacaksın. 
ASLA sadece "Doğru cevap A'dır" deyip geçme. HER YANLIŞ ŞIKKIN neden yanlış olduğunu açıkla.

ZORUNLU FORMAT (bu formata %100 uy):
"✅ Doğru cevap [harf]'dir: [Neden doğru olduğunun detaylı açıklaması. KESİNLİKLE "Mevzuatın X. sayfasında", "Metinde", "Kaynakta" GİBİ İFADELER KULLANMA! Bilgiyi doğrudan, kendinden emin bir şekilde ver — en az 2-3 cümle].

❌ [B şıkkının tam metni]) Yanlış çünkü: [somut, spesifik neden — neden bu şık çeldirici, gerçekte ne doğru]
❌ [C şıkkının tam metni]) Yanlış çünkü: [somut, spesifik neden]  
❌ [D şıkkının tam metni]) Yanlış çünkü: [somut, spesifik neden]
❌ [E şıkkının tam metni]) Yanlış çünkü: [somut, spesifik neden]\n
💡 Sınav İpucu: [Bu soruyla ilgili karıştırılabilecek önemli bir nokta veya ezber tekniği]"

⛔ YAPMA: Sadece "Doğru cevap A çünkü..." yazıp B, C, D, E'yi açıklamamak KABUL EDİLMEZ.
⛔ YAPMA: "Mevzuatta/Metinde/Kaynakta şöyle denmektedir:" gibi atıflar KESİNLİKLE KABUL EDİLMEZ. Doğrudan bilgiyi ver.
⛔ YAPMA: Tek kelimelik açıklamalar ("Yanlış", "Geçersiz") KABUL EDİLMEZ. Her şık için en az 1 cümle yaz.
✅ YAP: Her açıklama EN AZ 150 kelime olsun. Öğrenci her şıkkı okuyunca "neden yanlış" diye öğrensin.

KAYNAK METİN PARÇASI: "${chunkContent.replace(/"/g, "'")}"

Sadece JSON array döndür:
[
  {
    "text": "soru metni",
    "options": ["A) seçenek", "B) seçenek", "C) seçenek", "D) seçenek", "E) seçenek"],
    "correct": "A",
    "explanation": "✅ Doğru cevap A'dır: [detaylı açıklama].\\n\\n❌ B) Yanlış çünkü: [neden]\\n❌ C) Yanlış çünkü: [neden]\\n❌ D) Yanlış çünkü: [neden]\\n❌ E) Yanlış çünkü: [neden]\\n\\n💡 Sınav İpucu: [ipucu]",
    "difficulty": "easy|medium|hard"
  }
]
`

    let raw = await callAI(prompt, 2, fileUri)

    let attempt = 1
    const maxAttempts = 3
    let chunkQuestionsList: any[] = []

    while (attempt <= maxAttempts) {
      try {
        const parsed = extractCleanJson(raw)
        chunkQuestionsList = Array.isArray(parsed) ? parsed : []
        console.log(`[QUESTION_DEBUG] Parça ${i+1}: Parsed ${chunkQuestionsList.length} questions (Attempt #${attempt})`)

        if (chunkQuestionsList.length === 0) {
          throw new Error("Boş veya geçersiz JSON listesi.")
        }

        // Soru Müfettişi Devreye Giriyor!
        console.log(`[QUESTION_AUDIT] Parça ${i+1} Müfettiş derin soru denetimi başlatılıyor...`)
        const audit = await auditQuestionsAgainstSource(chunkContent, chunkQuestionsList, sectionTitle, fileUri)

        if (audit.passed) {
          console.log(`[QUESTION_AUDIT] ✅ Parça ${i+1} Müfettiş tüm soruları hatasız ve kusursuz onayladı!`)
          break
        }

        console.warn(`[QUESTION_AUDIT] ⚠️ Parça ${i+1} Müfettiş ${audit.issues.length} adet hata/halüsinasyon tespit etti!`)
        if (audit.issues.length > 0) {
          console.log(audit.issues.map(iss => `   - ${iss}`).join("\n"))
        }

        if (attempt === maxAttempts) {
          console.warn(`[QUESTION_AUDIT] Maximum audit deneme sayısına ulaşıldı, mevcut sorularla devam ediliyor.`)
          break
        }

        // Onarım Promptunu hazırla
        console.log(`[QUESTION_AUDIT] 🔄 Parça ${i+1} Sorular Müfettiş bulguları doğrultusunda yeniden onarılıyor...`)
        const repairIssues = [...audit.issues]
        if (audit.missingTopics && audit.missingTopics.length > 0) {
          repairIssues.push(...audit.missingTopics.map(t => `Eksik Konu: "${t}" hakkında kesinlikle soru sorulmalı ve test edilmelidir.`))
        }

        const repairPrompt = `
${prompt}

⚠️⚠️⚠️ ÇOK ÖNEMLİ — ÖNCEKİ DENEMEDE TESPİT EDİLEN HATALAR VEYA EKSİKLİKLER:
Yukarıda ürettiğin sorularda Soru Müfettişi tarafından aşağıdaki kritik bilgi hataları, uydurmalar veya eksiklikler tespit edildi. 
Lütfen bu hataları KESİNLİKLE düzelt, çelişkileri gider ve açıklamaları her şık için en az 1-2 cümle olacak şekilde baştan yaz:
- ${repairIssues.join("\n- ")}

Tüm kurallara ve şablon formatına %100 uyarak soruları yeniden sıfırdan üret. Sadece JSON array döndür.
`
        await new Promise(r => setTimeout(r, 4000)) // RPM limit nefes payı
        raw = await callAI(repairPrompt, 2, fileUri)
        attempt++
      } catch (e: any) {
        console.error(`[QUESTION_DEBUG] Parça ${i+1} Soru ayrıştırma/doğrulama hatası (Attempt #${attempt}): ${e.message}`)
        if (attempt === maxAttempts) break
        await new Promise(r => setTimeout(r, 4000))
        raw = await callAI(prompt, 2, fileUri)
        attempt++
      }
    }
    
    // Chunk'tan gelen başarılı soruları ana listeye ekle
    allQuestions = [...allQuestions, ...chunkQuestionsList]
    
    // Rate limit koruması
    if (i < chunks.length - 1) {
      console.log(`[QUESTION_GEN] ⏱️ Key ve limit koruması: Diğer parçaya geçmeden önce 5 saniye bekleniyor...`)
      await new Promise(r => setTimeout(r, 5000))
    }
  }

  // ==================== YEDEK GÜÇ (BACKUP POWER) BUFFER ====================
  // Eğer tüm denemeler bittiğinde hala test edilmemiş önemli konular varsa,
  // maks 5 adet hedeflenmiş Yedek Güç sorusu üretip doğrudan veritabanına eklenmek üzere listeye iliştiriyoruz.
  try {
    const finalAudit = await auditQuestionsAgainstSource(content, allQuestions, sectionTitle, fileUri)
    if (finalAudit.missingTopics && finalAudit.missingTopics.length > 0) {
      const backupCount = Math.min(5, finalAudit.missingTopics.length)
      console.log(`[YEDEK_GÜÇ] ⚡ Yedek güç devreye giriyor! Test edilmeden geçilen ${backupCount} eksik konu için hedeflenmiş yedek sorular üretiliyor...`)

      const backupPrompt = `
${getExamIntelligence(aiMode)}

DERS: ${courseName}
BÖLÜM: "${sectionTitle}"

Aşağıdaki eksik konuları test etmek için TAM olarak ${backupCount} adet akademik kalitede, çoktan seçmeli soru oluştur.
EKSİK KONULAR:
${finalAudit.missingTopics.slice(0, backupCount).map((t, idx) => `${idx + 1}. ${t}`).join("\n")}

SORU TİPLERİ VE BİLGİ DOĞRULUĞU KURALLARINA TAVİZSİZ UYUN.
Her şıkkın neden yanlış olduğunu ve neden doğru olduğunu tek tek ve detaylı açıklayın.

KAYNAK METİN: "${content.substring(0, 100000).replace(/"/g, "'")}"

Sadece JSON array döndür:
[
  {
    "text": "Soru metni?",
    "options": ["A) seçenek", "B) seçenek", "C) seçenek", "D) seçenek", "E) seçenek"],
    "correct": "A",
    "explanation": "✅ Doğru cevap A'dır: [açıklama].\\n\\n❌ B) Yanlış çünkü: [neden]\\n❌ C) Yanlış çünkü: [neden]\\n❌ D) Yanlış çünkü: [neden]\\n❌ E) Yanlış çünkü: [neden]",
    "difficulty": "medium"
  }
]
`
      await new Promise(r => setTimeout(r, 4000))
      const backupRaw = await callAI(backupPrompt, 1, fileUri)
      const backupQuestions = extractCleanJson(backupRaw)
      if (Array.isArray(backupQuestions) && backupQuestions.length > 0) {
        console.log(`[YEDEK_GÜÇ] ✅ Başarıyla ${backupQuestions.length} adet yedek güç sorusu üretildi.`)
        allQuestions = [...allQuestions, ...backupQuestions.slice(0, 5)]
      }
    }
  } catch (backupErr: any) {
    console.error(`[YEDEK_GÜÇ] ❌ Yedek güç soru üretimi sırasında hata oluştu:`, backupErr.message)
  }

  // ⚠️ SORU DOĞRU CEVAP ÇAPRAZ KONTROL (Cross-Check)
  let crossCheckFixed = 0
  for (const q of allQuestions) {
    if (!q.explanation || !q.correct) continue

    const explanationMatch = q.explanation.match(/(?:doğru\s+cevap|✅)\s*([A-E])[):\s]/i)
    if (explanationMatch) {
      const explainedCorrect = explanationMatch[1].toUpperCase()
      const declaredCorrect = q.correct.toUpperCase()

      if (explainedCorrect !== declaredCorrect) {
        console.warn(`[CROSS_CHECK] ⚠️ Tutarsız cevap! Soru: "${q.text.substring(0, 50)}..." → correct="${declaredCorrect}" ama açıklama "${explainedCorrect}" diyor. Açıklamaya göre düzeltiliyor.`)
        q.correct = explainedCorrect
        crossCheckFixed++
      }
    }
  }
  if (crossCheckFixed > 0) {
    console.log(`[CROSS_CHECK] 🔧 ${crossCheckFixed} soruda doğru cevap tutarsızlığı düzeltildi.`)
  }

  return allQuestions
}
