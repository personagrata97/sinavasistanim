export async function generateFlashcards(
  content: string,
  sectionTitle: string,
  courseName: string,
  userLevel: string = "beginner",
  aiMode: string = "general",
  fileUri?: string,
  pageStart?: number,
  pageEnd?: number,
): Promise<Array<{ front: string; back: string; difficulty: string }>> {
  const isGlossary = sectionTitle.toLocaleUpperCase("tr-TR").includes("KISALTMALAR") ||
    sectionTitle.toLocaleUpperCase("tr-TR").includes("SÖZLÜK") ||
    sectionTitle.toLocaleUpperCase("tr-TR").includes("TANIMLAR")

  // Chunking mantığı devreye giriyor!
  const chunkThreshold = 15000;
  const isChunked = content.length > chunkThreshold;
  const chunks = isChunked ? splitContentIntoChunks(content, chunkThreshold) : [content];
  
  console.log(`[FLASHCARD_GEN] Metin ${chunks.length} parçaya bölündü (Toplam Karakter: ${content.length})`);

  let allFlashcards: any[] = [];
  
  // Paralel işlem API'yi boğabilir, bu yüzden sıralı (sequential) gidiyoruz
  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i];
    console.log(`[FLASHCARD_GEN] Parça ${i+1}/${chunks.length} işleniyor... (Karakter: ${chunkContent.length})`);

    const levelCardStyle: Record<string, string> = {
      beginner: `
        - Zorluk dağılımı: %50 kolay, %30 orta, %20 zor
        - Kolay kartlarda temel kavram tanımları sor
        - Orta kartlarda basit karşılaştırmalar yap
        - Cevaplarda günlük hayattan örnekler ver
      `,
      intermediate: `
        - Zorluk dağılımı: %20 kolay, %50 orta, %30 zor
        - Orta kartlarda çeldirici kavram farkları sor
        - Zor kartlarda formül uygulamaları ve vaka soruları ekle
        - Cevaplarda sınav ipuçları ver
      `,
      advanced: `
        - Zorluk dağılımı: %10 kolay, %30 orta, %60 zor
        - Zor kartlarda detaylı mevzuat referansları sor
        - Çeldirici kavramları ayrıntılı açıkla
        - Her kartta sınav stratejisi ipucu ver
      `,
    }

    const instructionLimit = isGlossary
      ? `🚨 ÖZEL TALİMAT: Bu bölüm bir "${sectionTitle}" (Sözlük/Kısaltmalar) bölümüdür.\nBurada yer alan yüzlerce kısaltma/terim içinden SADECE Sermaye Piyasası Lisanslama (SPL) sınavlarında doğrudan sorulma potansiyeli yüksek olan, sektörel ve teknik öneme sahip kritik terimleri seç. "USB, SMS, PC" gibi aşırı basit terimleri KESİNLİKLE ATLA. Sadece 'Sınav Kalitesinde' olanları seç. Maksimum kart limiti yoktur.`
      : `DİNAMİK ÜRETİM: Bu metin ana "${sectionTitle}" bölümünün bir PARÇASIDIR. Lütfen bu metnin BİLGİ YOĞUNLUĞUNU analiz et. Eğer metin kurallar, cezalar, oranlar ve tanımlarla doluysa EN AZ 4-6 adet flashcard oluştur. Eğer metin sadece giriş, önsöz veya yüzeysel bilgilerden ibaretse sadece 1-2 adet temel flashcard oluştur. Kaliteden taviz verme.`

    const prompt = `
  ${getExamIntelligence(aiMode)}

  ${instructionLimit}
  ${fileUri ? `SAYFA ARALIĞI: Ekteki dosyanın ${pageStart} ile ${pageEnd}. sayfaları aralığı.` : ""}

  KART SEVİYESİ VE HEDEF KİTLE:
  ${levelCardStyle[userLevel] || ""}

  KART TÜRLERİ VE ÖRNEKLER:
  1. **Temel Kavram kartı:** "X nedir?" → Resmi tanım + 💡 akılda kalıcı örnek
  2. **Kıyaslama kartı:** "X ile Y arasındaki fark nedir?" → İki kavramın farkları
  3. **Mevzuat kartı:** "X sürecinde yasal sınır/süre nedir?" → Süre veya oran
  4. **İstisna kartı:** "X'in istisnası nedir?" → İstisna kuralı + neden önemli
  5. **Vaka kartı:** "Şu durumda ne yapılır?" → Kısa senaryo + doğru uygulama
  6. **Doğru/Yanlış kartı:** "X doğru mudur?" → Doğru/Yanlış + açıklama
  7. **Sıralama kartı:** "X sürecinin adımları nelerdir?" → Adım adım sıralı cevap

  VARYASYON KURALI (ÇOK ÖNEMLİ):
  Aynı kavramı FARKLI açılardan soran birden fazla kart üret. Örneğin:
  - Kart 1: "İhraççı nedir?" (tanım)
  - Kart 2: "İhraççı ile aracı kuruluş arasındaki fark nedir?" (karşılaştırma)
  - Kart 3: "Hangi durumlarda ihraççı SPK'ya başvurmak zorundadır?" (uygulama)

  KURALLAR:
  - Soru kısa ve net olsun, resmi terimleri AYNEN kullan
  - 📐 CEVAP FORMATI (ÇOK KRİTİK — İÇ İÇE YAPI YASAK!):
    Cevabı DÜZ, KISA VE NET paragraflar halinde yaz. İç içe madde işaretleri (nested bullets/sub-lists), alt alt liste yapıları KESİNLİKLE KULLANMA! Bilgiyi düz paragraf veya tek seviye madde listesi (flat list) olarak ver.
    Format şöyle olsun:
    - İlk 1-2 paragraf: Resmi/teknik cevap (kaynak metindeki tanım + açıklama). Düz metin, madde işaretsiz.
    - 💡 Akılda Kalıcı Örnek: 1-2 cümlelik benzetme veya senaryo.
    - 🪤 Dikkat: 1-2 cümlelik sınav tuzağı uyarısı.
    Toplam cevap 6-10 satırı GEÇMESİN. Kısa, öz ve okunabilir olsun.
  - 🛡️ EKSİKSİZ TANIM: Eğer bir kurumun (örn: BDDK, SPK) tanımını veya görevlerini yazıyorsan, sadece adından yola çıkarak (sadece bankalar gibi) sığ bir tanım yapma. Kaynak metinde geçen TÜM görevlerini ve denetlediği TÜM şirket tiplerini (Faktoring, Leasing vb.) kapsayan eksiksiz bir açıklama yap.
  - 🪤 Ekstra Dikkat Edilmesi Gereken Hususlar Nedir?: Öğrenciyi yanıltmak için şıklara konulabilecek çok benzer kavramlar, yanlış süreler (örn: 10 iş günü yerine 15 takvim günü) veya ezber yanılgıları. Her kartın arkasında bu uyarı KESİNLİKLE olmalıdır.
  - Özellikle rakam, süre, oran ve istisnaları soran kartlar bol olsun — sınavda en çok bunlar sorulur
  - 🚫 KESİNLİKLE YASAK: "Kaynak metne göre", "Verilen metne göre", "Ders notlarında", "Metinde belirtilen", "Mevzuata göre" gibi meta-ifadeleri ASLA kullanma. Soruları doğrudan genel geçer akademik doğrular olarak sor.
  - **ASLA KENDİ KAFANDAN SINAV TAKTİĞİ VEYA YORUM UYDURMA!** "Sınavda doğrudan şu terimler sorulmaktadır", "Buraya çok dikkat edin", "Bu konu çok önemlidir" gibi HOCALIK TASLAYAN veya kaynak metinde (PDF'te) olmayan hiçbir yönlendirici/abartı cümleyi **ASLA KULLANMA.**
  - 🇹🇷 DİL KALİTESİ: Türkçe dil bilgisi, kelime dizilimi ve akıcılığa %100 uy.

  KAYNAK METİN PARÇASI: "${chunkContent.replace(/"/g, "'")}"

  Sadece JSON array döndür:
  [
    {"front": "soru", "back": "cevap (resmi tanım + 💡 örnek + 🪤 Ekstra Dikkat Edilmesi Gereken Hususlar: [tuzak uyarısı])", "difficulty": "easy|medium|hard"}
  ]
  `
    let raw = await callAI(prompt, 2, fileUri)

    let attempt = 1
    const maxAttempts = 3
    let chunkFlashcardsList: any[] = []

    while (attempt <= maxAttempts) {
      try {
        const parsed = extractCleanJson(raw)
        chunkFlashcardsList = Array.isArray(parsed) ? parsed : []
        console.log(`[FLASHCARD_DEBUG] Parça ${i+1}: Parsed ${chunkFlashcardsList.length} flashcards (Attempt #${attempt})`)

        if (chunkFlashcardsList.length === 0) {
          throw new Error("Boş veya geçersiz JSON listesi.")
        }

        // Flashcard Müfettişi Devreye Giriyor!
        console.log(`[FLASHCARD_AUDIT] Parça ${i+1} Müfettiş derin flashcard denetimi başlatılıyor...`)
        const audit = await auditFlashcardsAgainstSource(chunkContent, chunkFlashcardsList, sectionTitle, fileUri)

        if (audit.passed) {
          console.log(`[FLASHCARD_AUDIT] ✅ Parça ${i+1} Müfettiş tüm flashcardları hatasız ve kusursuz onayladı!`)
          break
        }

        console.warn(`[FLASHCARD_AUDIT] ⚠️ Parça ${i+1} Müfettiş ${audit.issues.length} adet hata/halüsinasyon tespit etti!`)
        console.log(audit.issues.map(iss => `   - ${iss}`).join("\n"))

        if (attempt === maxAttempts) {
          console.warn(`[FLASHCARD_AUDIT] Maximum audit deneme sayısına ulaşıldı, mevcut kartlarla devam ediliyor.`)
          break
        }

        // Onarım Promptunu hazırla
        console.log(`[FLASHCARD_AUDIT] 🔄 Parça ${i+1} Flashcardlar Müfettiş bulguları doğrultusunda onarılıyor...`)
        const repairPrompt = `
  ${prompt}

  ⚠️⚠️⚠️ ÇOK ÖNEMLİ — ÖNCEKİ DENEMEDE TESPİT EDİLEN HATALAR:
  Yukarıda ürettiğin flashcardlarda Flashcard Müfettişi tarafından aşağıdaki kritik bilgi hataları veya yasal uyumsuzluklar tespit edildi. 
  Lütfen bu hataları KESİNLİKLE düzelt ve cevapları baştan yaz:
  - ${audit.issues.join("\n- ")}

  Tüm kurallara ve şablon formatına %100 uyarak flashcardları yeniden sıfırdan üret. Sadece JSON array döndür.
  `
        await new Promise(r => setTimeout(r, 4000)) // RPM limit nefes payı
        raw = await callAI(repairPrompt, 2, fileUri)
        attempt++
      } catch (e: any) {
        console.error(`[FLASHCARD_DEBUG] Parça ${i+1} Flashcard ayrıştırma/doğrulama hatası (Attempt #${attempt}): ${e.message}`)
        if (attempt === maxAttempts) break
        await new Promise(r => setTimeout(r, 4000))
        raw = await callAI(prompt, 2, fileUri)
        attempt++
      }
    }
    
    // Chunk'tan gelen başarılı kartları ana listeye ekle
    allFlashcards = [...allFlashcards, ...chunkFlashcardsList]
    
    // Rate limit koruması
    if (i < chunks.length - 1) {
      console.log(`[FLASHCARD_GEN] ⏱️ Key ve limit koruması: Diğer parçaya geçmeden önce 5 saniye bekleniyor...`)
      await new Promise(r => setTimeout(r, 5000))
    }
  }

  return allFlashcards
}
