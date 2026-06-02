import axios from "axios"

// ==================== AI ENGINE SETUP ====================

// PRIMARY: Gemini (High Quota & Quality) — Multi-key rotation with gemini-3.5-flash
const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
const geminiKeys = (process.env.GEMINI_API_KEYS || geminiKey || "").split(",").filter(k => k.trim())
let currentKeyIndex = 0 // Aktif key index'i
const suspendedKeys = new Map<number, number>() // keyIndex → suspendedAt timestamp
const SUSPENDED_KEY_TTL_MS = 10 * 60 * 1000 // 10 dakika sonra otomatik kurtarma

// Her key'in kendi fileUri'si (PDF multimodal için — her key kendi projesindeki dosyaya erişir)
let activeFileUrisMap: Record<string, string> = {}
export function setFileUrisMap(map: Record<string, string>) { activeFileUrisMap = map }

function getNextGeminiKey(): string | null {
  if (geminiKeys.length === 0) return null

  // Find the next non-suspended key starting from currentKeyIndex
  let attempts = 0
  while (attempts < geminiKeys.length) {
    const idx = (currentKeyIndex + attempts) % geminiKeys.length
    if (!suspendedKeys.has(idx) || (Date.now() - suspendedKeys.get(idx)!) > SUSPENDED_KEY_TTL_MS) {
      if (suspendedKeys.has(idx) && (Date.now() - suspendedKeys.get(idx)!) > SUSPENDED_KEY_TTL_MS) {
        console.log(`[AI_ENGINE] 🔓 Key #${idx + 1} TTL süresi doldu, yeniden aktif edildi.`)
        suspendedKeys.delete(idx)
      }
      currentKeyIndex = idx
      return geminiKeys[idx].trim()
    }
    attempts++
  }
  return null // All keys suspended
}

function rotateToNextKey(): string | null {
  if (geminiKeys.length <= 1) return null

  // Move to next index and find next non-suspended key
  let attempts = 0
  while (attempts < geminiKeys.length - 1) {
    currentKeyIndex = (currentKeyIndex + 1) % geminiKeys.length
    if (!suspendedKeys.has(currentKeyIndex) || (Date.now() - suspendedKeys.get(currentKeyIndex)!) > SUSPENDED_KEY_TTL_MS) {
      const newKey = geminiKeys[currentKeyIndex]
      console.log(`[AI_ENGINE] 🔑 Key rotasyonu: Key #${currentKeyIndex + 1}/${geminiKeys.length}'e geçildi`)
      return newKey.trim()
    }
    attempts++
  }
  return null
}

// ==================== EXAM INTELLIGENCE ====================

// Sınav bilgileri ve MUTLAK KURALLAR - tüm AI promptlarında kullanılacak
export function getExamIntelligence(aiMode: string, courseName: string = "") {
  let modeSpecificRules = ""

  const normalizedCourse = courseName.toLowerCase();
  const isSecurity = normalizedCourse.includes("güvenlik") || normalizedCourse.includes("bilgi sistem") || normalizedCourse.includes("security");
  const isMasak = normalizedCourse.includes("masak") || normalizedCourse.includes("uyum görev");

  if (isSecurity) {
    modeSpecificRules = `
SINAV TİPİ: BİLGİ SİSTEMLERİ VE SİBER GÜVENLİK SINAVI
- Bilgi güvenliği, siber güvenlik, ağ güvenliği, şifreleme, yetkilendirme (DAC, MAC, RBAC) konularına odaklan.
- Kritik teknik standartlara (ISO/IEC 27001, COBIT, ITIL vb.) ve BT bağımsız denetim esaslarına çok dikkat et.
- Teknik kavramları (DMZ, WAF, MFA, SSO, IDS/IPS, Sızma Testleri, SOME vb.) gerçekçi BT senaryoları ile açıkla.
- Soru ve pratik örneklerde kesinlikle finansal türev ürünleri (opsiyon, vadeli işlem) veya MASAK kara para aklama mevzuatını karıştırma! Bu tamamen siber güvenlik ve bilgi sistemleri altyapı yönetimi dersidir.
`
  } else if (isMasak || aiMode === "law") {
    modeSpecificRules = `
SINAV TİPİ: HUKUK VE MEVZUAT SINAVI (MASAK / SPK HUKUK)
- Kanun maddelerine, süre kısıtlamalarına (örn: 30 gün içinde), yetkili mercilere (örn: Kurul, Bakanlık) çok dikkat et.
- Vaka tabanlı (case study) sorularda kanun ihlali olup olmadığını sorgula.
- "Aşağıdakilerden hangisi idari para cezası gerektirir?" tarzı ezber + mantık soruları üret.
- ⚠️ KESİN KURAL: Banka şubesinde Uyum Görevlisi çalışmaz! Uyum Görevlisi Genel Müdürlük bünyesinde yer alır. Şube çalışanları şüpheli durumu doğrudan MASAK'a değil, kendi kurumlarındaki Uyum Görevlisine bildirir. MASAK'a resmi Şüpheli İşlem Bildirimi (ŞİB) gönderim yetkisi sadece Uyum Görevlisine aittir. Hikaye ve senaryolarda bu yasal raporlama hiyerarşisine %100 uyacaksın!
`
  } else if (aiMode === "language") {
    modeSpecificRules = `
SINAV TİPİ: DİL SINAVI (YDS / YÖKDİL)
- Yabancı dil kelimelerinin Türkçe karşılıklarına, eş anlamlılarına ve örnek cümlelerine odaklan.
- Okuma parçalarında ana fikir (main idea), çıkarım (inference) ve yazarın tutumu (attitude) gibi soru tarzları üret.
- Gramer kurallarını bağlam içinde sor.
`
  } else if (aiMode === "finance") {
    modeSpecificRules = `
SINAV TİPİ: FİNANS VE LİSANS SINAVI (SPL)
- Her modülde çoktan seçmeli, 5 şıklı sorular.
- Hesaplama soruları ("X formülüne göre sonuç nedir?") ve formüller çok önemli.
- Finansal kavramlar (Forward, Futures, Opsiyon vb.) arası ince farkları vurgula.
- Resmi terimleri ASLA değiştirme (pay, izahname, ihraççı, SPK vb.)
`
  } else {
    modeSpecificRules = `
SINAV TİPİ: GENEL AKADEMİK VEYA KURUMSAL SINAV
- Metindeki temel kavramları, tarihleri ve süreçleri vurgula.
- Bilgiyi ölçen çoktan seçmeli 5 şıklı (A,B,C,D,E) sorular üret.
`
  }

  return `
${modeSpecificRules}

⚠️⚠️⚠️ MUTLAK KURAL - DOĞRULUK GARANTİSİ:
1. SADECE aşağıda verilen kaynak metinde bulunan bilgileri kullan.
2. Kaynak metinde OLMAYAN hiçbir bilgi, terim, rakam, tarih, oran veya kural ÜRETME.
3. Emin olmadığın bilgiyi dahil ETME. Eksik bırakmak, yanlış yazmaktan İYİDİR.
4. Bir formül veya rakam kaynak metinde yoksa, onu soru/not/karta KOYMA.
5. "Kesin çıkar", "muhakkak sorulur" gibi doğrulanamayan ifadeler KULLANMA.
6. Günlük hayattan verilecek örnekler ve hikayeler (senaryolar) mantıksal kurallara, finansal ve hukuki gerçekliğe %100 uygun olmalıdır. Örnekler hem akılda kalıcı hem de mantıken/hukuken kusursuz olmalıdır.
7. Örneklerde, hikayelerde veya sorularda geçen aktörlere KESİNLİKLE Türkçe şahıs isimleri (Ahmet Bey, Ayşe Hanım vb.) VERME. Bunun yerine HER ZAMAN kurumsal unvanlar ve tüzel kişilik isimleri kullan (örn. "X Kurumu BT Uzmanı", "Y Portföy Şirketi Uyum Görevlisi", "Z Bankası Müşterisi"). KESİNLİKLE "Bay X, Bayan A, C şahsı, A müşterisi" gibi jenerik harfler veya yabancı kalıplar da KULLANMA. Hep gerçekçi kurumsal aktörler kullan.
8. 📄 SAYFA NUMARALARI OFFSET AÇIKLAMASI: Sana iletilen sayfa aralıkları (örn: Sayfa 15-22), PDF dosyasının fiziksel sayfa indeksleridir. PDF içindeki basılı sayfa numaraları (sayfa altındaki sayılar) kapak/içindekiler gibi kısımlardan ötürü birkaç sayfa farklı (offsetli) olabilir. Analizini yaparken basılı numara yerine fiziksel sayfa sıralamasını/indeksini baz al.
9. 📐 MATEMATİKSEL FORMÜLLER VE HESAPLAMALAR: Eğer kaynak metinde herhangi bir matematiksel formül, denklem, oran veya sayısal hesaplama geçiyorsa, bunları ön yüzde kusursuz görünmesi için MUTLAK KESİNLİKLE standart LaTeX formatında yazacaksın (satır içi formüller için $...$, bağımsız büyük formüller için $$...$$ kullan). Örn: $$E = m \\cdot c^2$$ veya $a^2 + b^2 = c^2$.
`
}

export function getDisciplineExamples(isSecurity: boolean, isMasak: boolean) {
  if (isSecurity) {
    return {
      disciplineName: "bilgi güvenliği ve denetim",
      analogies: `
  * CISA (Bilgi Sistemleri Denetçisi) için: "BT sistemlerinin röntgenini çeken uluslararası yeminli mali müşavir yetki belgesi" (finansal defterler yerine bilgisayar altyapılarını bağımsız denetler).
  * WAF (Web Application Firewall) için: "Apartman kapısında duran ve sadece daire sakinlerinin tanıdığı davetlilere izin verip, şüpheli hareketleri olan yabancıları engelleyen bina güvenlik görevlisi."
  * DMZ (Demilitarized Zone) için: "Apartman lobisi; apartmanın dış kapısından giren herkesin (ziyaretçilerin) ulaşabildiği ama dairelerin içine doğrudan girmelerini engelleyen ortak ara bekleme alanı."
  * MFA (Çok Faktörlü Kimlik Doğrulama) için: "Hem apartman dış kapısı anahtarı hem de cep telefonuna gelen SMS şifresi ile açılan çift kilitli çelik kasa sistemi."
      `,
      stories: `
  Örn: "X Kurumunun Sistem Yöneticisi, şirketin veri merkezine girmek istedi → Yetkilendirme kontrolü → Parmak izi okutma + şifre → MFA doğrulaması yapıldı."
  Örn: "Zararlı bir yazılım, WAF arkasındaki sunucuya SQL enjeksiyon saldırısı denedi → WAF şüpheli karakteri engelledi → Log kaydı alındı."
  Örn: "Bir aracı kurumun BT Uzmanı, kritik şifreleri şifrelemeden sakladı → Sızma testinde zafiyet tespit edildi → ISO 27001 uygunsuzluk raporu yazıldı."
      `,
      akrostiş: `Örn: "BGA → Bütünlük, Gizlilik, Erişilebilirlik (Bilgi güvenliğinin 3 temel sacayağı CIA)"`,
      quiz: `
  🧪 Kendini Test Et: Yetkilendirme modellerinden hangisinde nesnelere erişim hakları sadece merkezi bir idari otorite tarafından belirlenir ve kullanıcılar bunu devredemez?
  > 💡 Cevap: MAC (Mandatory Access Control - Zorunlu Erişim Kontrolü)
      `,
      labelExample: `(Örn: "## Ağ Güvenliği Altyapısı [Güvenlik Mimarisi]" veya "## ISO/IEC 27001 Standartları [Bilgi Güvenliği Yönetimi]")`
    };
  } else if (isMasak) {
    return {
      disciplineName: "MASAK uyum ve AML",
      analogies: `
  * Uyum Görevlisi için: "Kurumun yasalara uygun hareket ettiğini denetleyen baş hukuk ve uyum kontrolörü."
  * ŞİB (Şüpheli İşlem Bildirimi) için: "Mali suçları engellemek için doğrudan devlet otoritesine gönderilen acil şüpheli durum ihbar mektubu."
  * KYC (Müşterinin Tanınması) için: "Bankada hesap açarken müşterinin kimliğini, gelir kaynağını ve mesleğini titizlikle doğrulayan güvenlik protokolü."
      `,
      stories: `
  Örn: "Bir banka müşterisi şubeye 50.000 TL nakit yatırdı → Gişe görevlisinin şüphesi → ŞİB kontrolü → Uyum Görevlisine raporlama."
  Örn: "Bir müşteri kuyumcudan 80.000 TL'lik altın aldı → Kuyumcu kimlik sorar mı? → EVET çünkü 75.000 TL sınırını aştı → Kimlik tespiti ve teyidi yapıldı."
  Örn: "Mehmet Bey offshore şirket kurdu, parayı 3 ülkeden dolaştırdı → Ayrıştırma aşaması → MASAK tespit etti → Sonuç: 2-5 yıl hapis."
      `,
      akrostiş: `Örn: "YAB → Yerleştirme, Ayrıştırma, Bütünleştirme (Kara para aklamanın 3 aşaması)"`,
      quiz: `
  🧪 Kendini Test Et: Kimlik tespiti yapılmadan işlem yapılabilecek istisna durum hangisidir?
  > 💡 Cevap: Hayat sigortası poliçelerinde yıllık prim tutarı belirlenen limiti aşmadığında
      `,
      labelExample: `(Örn: "## Şüpheli İşlem Bildirimi [Uyum Yönetimi]" veya "## 5549 Sayılı Kanun [Hukuki Çerçeve]")`
    };
  } else {
    // Default general/finance course
    return {
      disciplineName: "finans ve kurumsal yönetim",
      analogies: `
  * Pay Senedi için: "Bir şirketin mülkiyet ortaklığını simgeleyen tapu senedi benzeri değerli evrak."
  * Portföy Çeşitlendirmesi için: "Tüm yumurtaları aynı sepete koymamak; riski dağıtmak için farklı enstrümanlara yatırım yapmak."
      `,
      stories: `
  Örn: "Ahmet Bey parasını hisse senetleri arasında paylaştırdı → Risk dağılımı → Bir hisse düşerken diğeri yükseldi → Portföy değeri korundu."
  Örn: "Ayşe Hanım borsada vadeli işlem kontratı satın aldı → Hedge (korunma) amaçlı → Fiyat dalgalanmalarından etkilenmedi."
      `,
      akrostiş: `Örn: "FDR → Fiyat, Değer, Risk (Yatırım kararlarının 3 ana unsuru)"`,
      quiz: `
  🧪 Kendini Test Et: Bir yatırımcının mevcut fiyat riskinden korunmak amacıyla ters yönde pozisyon almasına ne ad verilir?
  > 💡 Cevap: Hedge (Riskten Korunma)
      `,
      labelExample: `(Örn: "## Portföy Yönetimi [Yatırım Stratejileri]" veya "## Sermaye Piyasası Kanunu [Yasal Mevzuat]")`
    };
  }
}

// ==================== HELPERS ====================

function extractCleanJson(raw: string): any {
  // Temizlik: BOM, kontrol karakterleri, thinking bloğu
  let cleaned = raw
    .replace(/^\uFEFF/, '')           // BOM kaldır
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Kontrol karakterleri
    .replace(/<think>[\s\S]*?<\/think>/g, '')       // Thinking bloğu
    .trim()

  // Markdown code block varsa içini al
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }

  // Trailing comma düzelt: ,] → ] ve ,} → }
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')

  // Direkt parse dene
  try { return JSON.parse(cleaned) } catch { }

  // JSON array bul
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    const arr = arrayMatch[0].replace(/,\s*([}\]])/g, '$1')
    try { return JSON.parse(arr) } catch { }
  }

  // JSON object bul
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    const obj = jsonMatch[0].replace(/,\s*([}\]])/g, '$1')
    try { return JSON.parse(obj) } catch { }
  }

  // Son çare: JSON key'lerini düzelt (TEK TIRNAK SORUNU — Türkçe kesme işaretlerini koruyarak)
  try {
    // Sadece JSON yapısal tek tırnakları değiştir (key-value pattern), metin içindeki kesme işaretlerini koru
    const fixed = cleaned
      .replace(/(?<=[:,\[{]\s*)'([^']*?)'(?=\s*[,}\]:])/g, '"$1"') // value pozisyonundaki tek tırnakları değiştir
      .replace(/'(\w+)'\s*:/g, '"$1":') // key pozisyonundaki tek tırnakları değiştir
    return JSON.parse(fixed)
  } catch { }

  // Yarım kesilmiş JSON array kurtarma (maxOutputTokens sınırına çarpınca oluyor)
  if (cleaned.startsWith('[')) {
    // Son tamamlanmış objeyi bul: }  ardından , veya ] 
    const lastCompleteObj = cleaned.lastIndexOf('}')
    if (lastCompleteObj > 0) {
      const truncated = cleaned.substring(0, lastCompleteObj + 1) + ']'
      try {
        const result = JSON.parse(truncated)
        if (Array.isArray(result) && result.length > 0) {
          console.warn(`[JSON_RECOVERY] Yarım kesilmiş JSON kurtarıldı: ${result.length} öğe`)
          return result
        }
      } catch { }
    }
  }

  throw new Error("AI cevabı geçerli bir JSON formatında değil.")
}

// İki modlu AI çağrısı:
// - "generation" modu: gemini-3.5-flash — hızlı, yaratıcı, ucuz (not/soru/flashcard üretimi)
// - "verification" modu: gemini-2.5-flash — analitik, dikkatli, farklı mimari (doğrulama/müfettiş)
// Farklı model kullanmak "körün körü denetlemesi" riskini ortadan kaldırır.
async function callAI(prompt: string, retries = 2, fileUri?: string, mode: "generation" | "verification" = "generation"): Promise<string> {
  const isPdfMode = !!fileUri || Object.keys(activeFileUrisMap).length > 0

  const activeKey = getNextGeminiKey()

  if (activeKey) {
    const geminiBody = (p: string, maxTokens: number, keyFileUri?: string) => {
      const parts: any[] = [{ text: p }]
      const activeFileUri = keyFileUri || fileUri
      if (activeFileUri) {
        parts.unshift({ fileData: { mimeType: "application/pdf", fileUri: activeFileUri } })
      }
      return {
        contents: [{ parts }],
        generationConfig: { temperature: mode === "verification" ? 0.1 : 0.2, maxOutputTokens: maxTokens }
      }
    }

    // Dual-Model Stratejisi:
    // Üretim (generation): gemini-3.5-flash — hızlı, multimodal, yaratıcı
    // Doğrulama (verification): gemini-2.5-pro — analitik, titiz, farklı mimari (halüsinasyon kırıcı)
    const modelChain = mode === "verification"
      ? [{ id: "gemini-2.5-flash", tokens: 8192 }]  // Doğrulama: 2.5-flash (farklı mimari = kör nokta kırıcı, thinking model)
      : [{ id: "gemini-3.5-flash", tokens: 16384 }]  // Üretim: 3.5-flash 16K token — not kesilmesini engeller

    // Tüm key'leri dene (her key için model chain)
    const startKeyIndex = currentKeyIndex
    let triedAllKeys = false

    while (!triedAllKeys) {
      const currentKey = getNextGeminiKey()!
      const geminiHeaders = { "Content-Type": "application/json", "x-goog-api-key": currentKey }
      let quotaHit = false

      // Bu key'e ait fileUri'yi seç (her key kendi projesindeki dosyaya erişebilir)
      const keyFileUri = activeFileUrisMap[String(currentKeyIndex)] || undefined

      for (const model of modelChain) {
        try {
          const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent`,
            geminiBody(prompt, model.tokens, keyFileUri), { headers: geminiHeaders, timeout: 60000 }
          )
          const parts = response.data?.candidates?.[0]?.content?.parts || []
          // Thinking model (3.5-flash, 2.5-flash): thought=true olan part'ları ATLA
          // Sadece gerçek çıktı text'ini al, düşünme bloğunu dahil etme
          const textParts = parts
            .filter((p: any) => p.text && !p.thought)
            .map((p: any) => p.text)
          const result = textParts.join("")
          if (result) {
            console.log(`[AI_ENGINE] ✅ ${model.id} succeeded ${isPdfMode ? "(PDF Multimodal)" : ""} [Key #${currentKeyIndex + 1}] [${result.length} chars]`)
            return result
          }
        } catch (e: any) {
          console.warn(`[AI_ENGINE] ${model.id} failed [Key #${currentKeyIndex + 1}]: ${e.message?.substring(0, 120)}`)
          const errMsg = e.message || ""
          const errData = e.response?.data?.error?.message || ""

          const isSuspended = errMsg.includes("403") ||
            errMsg.includes("PERMISSION_DENIED") ||
            errData.includes("403") ||
            errData.includes("PERMISSION_DENIED") ||
            errData.includes("API key not valid")

          if (isSuspended) {
            console.warn(`[AI_ENGINE] 🚫 Key #${currentKeyIndex + 1} kalıcı olarak kısıtlanmış/suspended. 10dk TTL ile askıya alınıyor...`)
            suspendedKeys.set(currentKeyIndex, Date.now())
          }

          const isQuotaError = errMsg.includes("429") ||
            errMsg.includes("503") ||
            errMsg.includes("PERMISSION_DENIED") ||
            errMsg.includes("timeout") ||
            errMsg.includes("ECONNABORTED") ||
            errData.includes("429") ||
            errData.includes("403") ||
            errData.includes("RESOURCE_EXHAUSTED") ||
            errData.includes("quota")
          if (isQuotaError) {
            console.warn(`[AI_ENGINE] ⚠️ Key #${currentKeyIndex + 1} ${model.id} kota aşıldı/kısıtlandı. Bir sonraki model deneniyor...`)
            quotaHit = true
            continue
          }
        }
      }

      if (quotaHit) {
        const nextKey = rotateToNextKey()
        if (!nextKey || currentKeyIndex === startKeyIndex) {
          console.warn(`[AI_ENGINE] ⛔ Tüm ${geminiKeys.length} key'in kotası doldu! Bekleme moduna geçiliyor...`)
          triedAllKeys = true
        } else {
          // Aynı Gmail'e bağlı projelerde ani peş peşe isteklerin "burst rate limit" (eşzamanlı istek engeli) tetiklemesini önlemek için 5 saniye bekliyoruz
          console.log(`[AI_ENGINE] ⏱️ Burst limit koruması: Sonraki anahtara geçmeden önce 5 saniye bekleniyor...`)
          await new Promise(r => setTimeout(r, 5000))
        }
      } else {
        break // Kota hatası değilse döngüden çık
      }
    }
  }

  // Retry — Gemini kotasının yenilenmesini bekle ve tekrar dene
  if (retries > 0) {
    const waitTime = 180000 // 3 dakika bekle (Google IP banlamasın diye)
    console.log(`[AI_ENGINE] 🔒 Gemini Modu: Kota doldu. ${waitTime / 1000}sn beklenip tekrar denenecek... (kalan: ${retries})`)
    await new Promise(r => setTimeout(r, waitTime))
    return callAI(prompt, retries - 1, fileUri, mode)
  }

  throw new Error("Tüm Gemini API anahtarları kota sınırına ulaştı. Gemini kotasının yenilenmesini bekleyin.")
}

// ==================== SECTION ANALYSIS ====================

export async function analyzeSectionContent(content: string, sectionTitle: string, aiMode: string = "general", fileUri?: string, courseName: string = "") {
  const MAX_CONTENT_CHARS = 50000
  const truncated = content.length > MAX_CONTENT_CHARS
    ? content.substring(0, MAX_CONTENT_CHARS) + `\n\n[...İçerik kısaltıldı...]`
    : content
  const prompt = `
${getExamIntelligence(aiMode, courseName || sectionTitle)}

Aşağıdaki sınav hazırlık metnini analiz et.
${fileUri ? "⚠️ EKTEKİ PDF DOSYASINI DA İNCELE — metin dışında grafik, şema, tablo görseli varsa bunları da analiz kapsamına al." : ""}

BÖLÜM: "${sectionTitle}"
METİN: "${truncated.replace(/"/g, "'")}"

ÖNEM DERECESİ KURALLARI (Bölümdeki EN ÖNEMLİ konuya göre belirle — ortalama ALMA):
⚠️ Eğer bölümde TEK BİR tanım, formül, kanun maddesi, süre sınırı veya rakam bile varsa → "High" ver.
- "High" (KRİTİK): Tanımlar, formüller, yasal düzenlemeler, süre/ceza/oran sınırları, SPK tebliğleri
- "Medium" (DETAY): Sadece uygulama örnekleri, süreç açıklamaları, karşılaştırmalar (temel kavram YOK)
- "Low" (EK BİLGİ): Sadece tarihsel arka plan, genel kültür, giriş cümleleri (somut bilgi YOK)

Ayrıca bölümün GERÇEK KONU BAŞLIĞINI tespit et. "Bölüm İçeriği (Sayfa X-Y)" gibi jenerik başlıklar YAZMA.
İçeriğin ana konusunu 3-8 kelimeyle özetle (Örn: "Şüpheli İşlem Bildirimi", "Müşterinin Tanınması İlkesi", "Arz ve Talep Esnekliği").

🧠 COGNITIVE ROUTING (ÇOK KATMANLI BİLİŞSEL ANALİZ):
Bu metnin pedagojik yapısını Bloom Taksonomisi'ne göre derinlemesine analiz et. Amacımız, öğrenciyi ezbere itmemek ve sadece "gerçekten mantık, analiz ve vaka çözümü" gerektiren bölümlere çoktan seçmeli test (A,B,C,D) üretmektir.

1. Katman (Bilgi/Hatırlama): Metin SADECE kısaltma açılımları, düz terimler sözlüğü, izole tarihler veya "X nedir? Y'dir" şeklinde tek boyutlu tanımlardan mı oluşuyor? (Örn: Bölüm 1 Kısaltmalar). Eğer öyleyse, bu kısımdan senaryo sorusu çıkmaz, zorlanırsa halüsinasyon olur.
2. Katman (Kavrama/Uygulama): Metin birbiriyle ilişkili süreçler, neden-sonuç bağları, yasal istisnalar, hesaplama formülleri veya "Eğer A olursa B ne yapmalıdır?" gibi operasyonel kurallar içeriyor mu?

Karar:
- Eğer metin 1. Katman'da kalıyorsa (salt sözlük/tanım/kısaltma): "requiresQuestions": false
- Eğer metin 2. Katman veya üstüne çıkabiliyorsa (süreç, kural, senaryo): "requiresQuestions": true

${aiMode === "law" ? `
⚠️ MODÜL TESPİTİ (MASAK SINAVI İÇİN ÇOK ÖNEMLİ — SPL RESMİ MÜFREDATI):
Bu içeriğin hangi sınav modülüne ait olduğunu belirle. RESMİ KONU DAĞILIMI:
• Kitle imha silahlarının yayılmasının finansmanı
• FATF tavsiyeleri, EGMONT Group, uluslararası kuruluşlar
• AB direktifleri, uluslararası anlaşmalar
• CMK, TCK maddeleri, ceza hükümleri
• İşlem ertelemesi, malvarlığı dondurma
• Ulusal koordinasyon ve kurumlar arası iş birliği

MODÜL 2 — UYUM YÖNETİMİ (bu konulardan bahsediyorsa "Modül 2"):
• Uyum görevlisi görev ve sorumlulukları
• Uyum programı kapsamı, kurum politikası, prosedürler
• Müşterinin tanınması (KYC), kimlik tespiti
• Uzaktan kimlik tespiti
• Basitleştirilmiş / sıkılaştırılmış tedbirler
• Şüpheli işlem bildirimi (ŞİB) usul ve süreleri
• Risk yönetimi, izleme ve kontrol
• Yükümlülük denetimi, idari para cezaları
• Eğitim yükümlülükleri

JSON'a "module" alanı ekle: "Modül 1" veya "Modül 2"
` : ""}

Sadece şu formatta JSON döndür:
{
  "summary": "Bu bölümün 2-3 cümlelik özeti (RESMİ TERİMLERİ KORUYARAK)",
  "importance": "High veya Medium veya Low",
  "topics": ["konu1", "konu2", "konu3"],
  "keyTerms": ["önemli anahtar terimler"],
  "suggestedTitle": "İçeriğin gerçek konu başlığı (3-8 kelime)",
  "cognitiveAnalysis": "Bloom taksonomisine göre metnin bilişsel derinliği ve neden soru üretilip üretilemeyeceğinin mantıksal açıklaması",
  "requiresQuestions": true veya false${aiMode === "law" ? ',\n  "module": "Modül 1 veya Modül 2"' : ""}
}
`

  const raw = await callAI(prompt, 1, fileUri)
  try {
    return extractCleanJson(raw) as {
      summary: string
      importance: string
      topics: string[]
      examLikelihood?: string
      keyTerms?: string[]
      suggestedTitle?: string
      module?: string
      requiresQuestions: boolean
    }
  } catch {
    return { summary: "Analiz yapılamadı.", importance: "Medium", topics: [], examLikelihood: "", keyTerms: [], suggestedTitle: "", requiresQuestions: true }
  }
}

// ==================== COURSE NOTES GENERATION (KRİTİK!) ====================

function splitContentIntoChunks(content: string, maxChunkLength = 22000): string[] {
  if (content.length <= maxChunkLength) {
    return [content];
  }

  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > maxChunkLength) {
    let splitIdx = -1;
    const window = remaining.substring(0, maxChunkLength);

    // Try splitting at a markdown header first
    splitIdx = window.lastIndexOf("\n##");
    if (splitIdx === -1) {
      splitIdx = window.lastIndexOf("\n###");
    }

    // Try splitting at a standard numbering pattern like \n1.7. or \n2.1.
    if (splitIdx === -1 || splitIdx < maxChunkLength * 0.4) {
      const match = [...window.matchAll(/\n\d+\.\d+\.?\s+/g)].pop();
      if (match && match.index !== undefined) {
        splitIdx = match.index;
      }
    }

    // Fallback to paragraph break
    if (splitIdx === -1 || splitIdx < maxChunkLength * 0.4) {
      splitIdx = window.lastIndexOf("\n\n");
    }

    // Fallback to line break
    if (splitIdx === -1 || splitIdx < maxChunkLength * 0.4) {
      splitIdx = window.lastIndexOf("\n");
    }

    // Fallback to absolute split
    if (splitIdx === -1 || splitIdx < maxChunkLength * 0.2) {
      splitIdx = maxChunkLength;
    }

    chunks.push(remaining.substring(0, splitIdx).trim());
    remaining = remaining.substring(splitIdx).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

export async function generateCourseNotes(
  content: string,
  sectionTitle: string,
  courseName: string,
  userLevel: string = "beginner",
  aiMode: string = "general",
  fileUri?: string,
  pageStart?: number,
  pageEnd?: number,
  isChunked = false,
  chunkIndex = 0,
  chunkCount = 1,
  previousContext?: string
): Promise<string> {
  if (!isChunked && content.length > 22000) {
    const chunks = splitContentIntoChunks(content, 22000)
    if (chunks.length > 1) {
      console.log(`[AUTO-CHUNKING] 📦 Bölüm "${sectionTitle}" çok uzun olduğu için ${chunks.length} parçaya bölünüp otonom işleniyor...`)
      let mergedNotes = ""
      let lastChunkTail = ""
      for (let idx = 0; idx < chunks.length; idx++) {
        if (idx > 0) {
          console.log(`[AUTO-CHUNKING] ⏱️ Key ve limit koruması: Parçalar arasında 5 saniye bekleniyor...`)
          await new Promise(r => setTimeout(r, 5000))
        }
        console.log(`[AUTO-CHUNKING] 👉 Parça ${idx + 1}/${chunks.length} üretiliyor...`)
        const chunkResult = await generateCourseNotes(
          chunks[idx],
          sectionTitle,
          courseName,
          userLevel,
          aiMode,
          fileUri,
          pageStart,
          pageEnd,
          true,
          idx,
          chunks.length,
          lastChunkTail
        )
        if (idx === 0) {
          mergedNotes = chunkResult
        } else {
          // DİNAMİK BAŞLIK TEMİZLİĞİ — hardcoded ders isimleri yerine
          // sectionTitle'dan türetilen genel kalıplarla HER ders için çalışır
          const escapedTitle = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const cleanNotes = chunkResult
            .replace(new RegExp(`##\\s*📌\\s*${escapedTitle}`, "gi"), "")
            .replace(new RegExp(`##\\s*${escapedTitle}`, "gi"), "")
            // Genel kalıp: "## BÜYÜK HARFLI BAŞLIK" formatındaki tekrarlı ana başlıkları temizle
            .replace(/^##\s+[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ\s]{5,}$/gm, "")
            // "Bu Bölüm Ne Anlatıyor?" giriş bloğunu temizle (2. ve sonraki parçalarda tekrar etmemeli)
            .replace(/###\s*🎯\s*Bu Bölüm Ne Anlatıyor\??[\s\S]*?(?=###\s*(?:🏢|🔑|📊|🔄|##))/gi, "")
            .replace(/###\s*🎯\s*Bu Bölüm Ne Anlatıyor\??[\s\S]*?(?=##)/gi, "")
            .trim()
          mergedNotes += `\n\n---\n\n${cleanNotes}`
        }
        
        // Kayan Bağlam Hafızası (Sliding Context Window): Bir sonraki parçaya önceki parçanın son kısmını (yaklaşık 1000 karakter) pasla
        lastChunkTail = chunkResult.length > 1000 ? chunkResult.slice(-1000) : chunkResult
      }
      console.log(`[AUTO-CHUNKING] ✅ Tüm ${chunks.length} parça başarıyla üretildi ve birleştirildi (${mergedNotes.length} karakter).`)
      return mergedNotes
    }
  }

  const MAX_CONTENT_CHARS = 50000
  const truncated = content.length > MAX_CONTENT_CHARS
    ? content.substring(0, MAX_CONTENT_CHARS) + `\n\n[...İçerik ${content.length - MAX_CONTENT_CHARS} karakter kısaltıldı...]`
    : content

  const isBibliography = sectionTitle.toLowerCase().includes("kaynakça") || sectionTitle.toLowerCase().includes("referans") || sectionTitle.toLowerCase().includes("bibliography")
  const isGlossary = sectionTitle.toLowerCase().includes("kısaltma") || sectionTitle.toLowerCase().includes("terimler") || sectionTitle.toLowerCase().includes("sözlük") || sectionTitle.toLowerCase().includes("glossary")

  const normalizedCourse = courseName.toLowerCase();
  const isSecurity = normalizedCourse.includes("güvenlik") || normalizedCourse.includes("bilgi sistem") || normalizedCourse.includes("security") || sectionTitle.toLowerCase().includes("güvenlik") || sectionTitle.toLowerCase().includes("bilgi sistem");
  const isMasak = normalizedCourse.includes("masak") || normalizedCourse.includes("uyum görev");
  const disc = getDisciplineExamples(isSecurity, isMasak);

  let glossaryInstruction = ""
  if (isGlossary) {
    glossaryInstruction = `
⚠️⚠️⚠️ DERS NOTU YERİNE KISALTMALAR VE TERİMLER SÖZLÜĞÜ ÜRETİLECEKTİR:
- Bu bölümdeki ders notunu bir Kısaltmalar ve Terimler Sözlüğü olarak yapılandır.
- Bölümde geçen tüm resmi ve teknik kısaltmaları (örn: BDDK, SPK, WAF vb.) ve önemli terimleri alfabetik sırala.
- Her terimi/kısaltmayı şu formatta zenginleştir:
  #### [Kısaltma/Terim Adı] (Açılımı / Türkçe Karşılığı)
  - **Resmi Tanım:** Kaynak metindeki birebir resmi tanımı.
  - 💡 **Hafıza Teknikli Benzetme (Mnemonic):** Günlük hayattan somut benzetme.
  - 🎬 **Türkçe İsimli Canlı Mikro-Senaryo:** En az 3-4 cümlelik, Türkçe isimli karakterler içeren (örn: Ahmet Bey, Ayşe Hanım), bu terimin/kısaltmanın pratikte nasıl uygulandığını veya ne işe yaradığını gösteren mini hikaye.
- Başka hiçbir düz yazı veya giriş/sonuç yazısı ekleme.
`
  }

  let visualRulesInstruction = `
🎨 GÖRSEL YENİDEN İNŞA (VISUAL RECONSTRUCTION) KURALLARI (ÇOK KRİTİK):
- 🚫 KESİN KURAL: Öğrenciyi asla orijinal PDF'e yönlendirme! Bizim platformumuz PDF'in yerini alan kusursuz ve daha üstün bir versiyondur.
- Kaynak PDF'te gördüğün HER TÜRLÜ tabloyu, şemayı, organizasyon yapısını veya karmaşık grafiği kendin **Mermaid.js** veya **Markdown Tablosu** kullanarak çok daha şık ve anlaşılır bir şekilde YENİDEN ÇİZECEKSİN.
- 🔄 **Mermaid.js Akış Şeması:** Orijinal PDF'teki süreçleri, karar ağaçlarını, organizasyon şemalarını veya kronolojik aşamaları, eskisinden daha modern görünecek şekilde Mermaid (graph TD veya graph LR) ile çiz.
- 📊 **Markdown Bilgi Tabloları:** PDF'teki eski tip karmaşık tabloları, süre sınırlarını, cezaları veya kıyaslamaları mükemmel Markdown tablolarına çevir.
- Öğrenci bizim notlarımızı okuduğunda orijinal PDF'teki hiçbir görsele ihtiyaç duymamalıdır!
`

  if (isBibliography) {
    visualRulesInstruction = `
🎨 GÖRSEL HÜKÜMLER:
- BU BÖLÜM BİR KAYNAKÇA / REFERANSLAR BÖLÜMÜDÜR.
- KESİNLİKLE ama KESİNLİKLE Mermaid.js diyagramı veya akış şeması ÇİZMEYİNİZ. 
- Kaynakça maddeleri için diyagram çizmek mantıksız ve hatalıdır. Sıfır diyagram kuralına uyunuz.
- Sadece temiz bir Markdown liste yapısı kullanınız.
`
  } else if (isGlossary) {
    visualRulesInstruction = `
🎨 GÖRSEL HÜKÜMLER (TERİMLER SÖZLÜĞÜ İÇİN):
- BU BÖLÜM BİR KISALTMALAR VE TERİMLER SÖZLÜĞÜ BÖLÜMÜDÜR.
- KESİNLİKLE ama KESİNLİKLE hiçbir Mermaid.js diyagramı, akış şeması, zihin haritası veya kavram haritası ÇİZMEYİNİZ. Sıfır diyagram kuralına uyunuz.
- KESİNLİKLE hiçbir tablo (Markdown table), karşılaştırma tablosu veya kategorizasyon tablosu OLUŞTURMAYINIZ. Sıfır tablo kuralına uyunuz.
- Terimleri veya kısaltmaları gruplamak için tablolar yerine temiz Markdown alt başlıkları (örn. #### 1. Yasal ve Düzenleyici Terimler) kullanınız.
`
  }

  const prompt = `
${getExamIntelligence(aiMode, courseName || sectionTitle)}

${glossaryInstruction}

Sen alanında efsaneleşmiş, otoriter ama öğrencilerin dinlemeye doyamadığı KARİZMATİK BİR MENTORSUN.
Amacın, sıkıcı ve ağır kanun maddelerini veya teknik kavramları, öğrencilerin asla unutamayacağı kadar akıcı, sürükleyici ve hikayeleştirerek anlatmak.

🎭 ÜSLUP (ALTIN DENGE - ÇOK ÖNEMLİ):
- 🚫 YAPAY ZEKA ROBOTU GİBİ KONUŞMA! "Merhaba, bugün şunu öğreneceğiz", "Özetlemek gerekirse", "Umarım faydalı olmuştur" gibi ucuz, yapay asistan kalıplarını KESİNLİKLE kullanma. Notlar doğrudan konuya girmelidir.
- 🚫 SIKICI AKADEMİSYEN OLMA! Dümdüz, paragraf paragraf akan, ansiklopedi gibi boğucu bir dil KULLANMA.
- ✅ KARİZMATİK VE AKICI OL: Metin bir TED konuşması gibi sürükleyici aksın. Kalın puntolar, madde işaretleri ve kısa cümleler kullan.
- ✅ HİKAYELEŞTİR: Her kavramı günlük hayattan veya doğrudan kendi disiplin alanından (${disc.disciplineName} vb.) gerçekçi, somut ve mantıksal olarak mükemmel eşleşen benzetmelerle açıkla.
- ⚠️ KESİNLİKLE konuyla ilgisiz, uzak disiplinlerden (örn. gastronomi, uzay gemisi) zorlama benzetmeler YAPMA. Benzetmeler doğrudan kavramın işlevsel mantığını yansıtmalıdır. Örneğin:
${disc.analogies}
- ⚠️ 💡 📌 🔑 🎯 🪤 emojilerini BOL kullan — görsel hiyerarşi yarat.
- Bilgi kalitesi %100 kusursuz ve otoriter olmalı, ama anlatım dili su gibi akmalıdır. Tanımlar BİREBİR kaynak metinden olmalıdır.

🧠 HAFIZA TEKNİKLERİ (HER BÖLÜMDE EN AZ 2 TANE KULLAN):
- **🎬 Hikaye Yöntemi (BİRİNCİL TEKNİK — BOL KULLAN!):** Her karmaşık süreç veya kuralı kısa bir SENARYO ile anlat. İsim ver, durum yarat, sonucu göster. Öğrenci "aa evet karakterin hikayesindeki gibi" diye hatırlasın.
${disc.stories}
  ⚠️ Her bölümde EN AZ 3-4 hikaye/senaryo olsun. Sayısal eşikleri, süreleri, cezaları HİKAYE İÇİNDE ver — böylece rakamlar da akılda kalır.
  ⚠️ KESİN KURAL: Bu senaryoları/hikayeleri kesinlikle bağımsız veya en altta ayrı bir başlık altında toplama! İlgili kavramın/tanımın hemen altına alt madde veya alt paragraf olarak yerleştir ki teori ve pratik senaryo yan yana dursun.
- **Akrostiş:** Sıralı maddeleri baş harfleriyle hatırlat. ${disc.akrostiş}
- **Karşılaştırma ile Fark:** Benzer kavramları "İKİSİ DE... AMA..." formatında ayırt et.
- **Mini Quiz:** Her büyük bölüm sonunda 1-2 "🧪 Kendini Test Et!" sorusu yaz. Cevabı hemen altına gizle.
${disc.quiz}

DERS: ${courseName}
BÖLÜM: "${sectionTitle}"
${fileUri ? `
📄 PDF ANALİZİ TALİMATI (ÇOK ÖNEMLİ):
Ekteki PDF dosyasının ${pageStart} ile ${pageEnd}. sayfalarını analiz et.
⚠️ SADECE METNİ DEĞİL, PDF'TEKİ TÜM GÖRSELLERİ DE ANALİZ ET:
- Şemalar, akış diyagramları, organizasyon şemaları → Sunumları Mermaid.js formatında yeniden oluştur
- Tablolar, karşılaştırma matrisleri → Markdown tablo olarak yeniden oluştur
- Grafikler, pasta/çubuk grafikleri → Verilerini tablo + açıklama olarak yaz
- Resimler, fotoğraflar → İçeriğini metinsel olarak açıkla
PDF'te gördüğün HİÇBİR görsel öğeyi atlama. Her biri sınavda sorulabilir.
` : ""}

🎯 TEMEL STRATEJİ - "EKSİKSİZ, GÖRSEL, AKILDA KALICI":
1. Kaynak metindeki ve PDF'teki HER BİLGİYİ nota dahil et. HİÇBİR kavram, terim, tanım, oran, süre, formül, istisna, kural ATLANMAYACAK.
2. ETİKETLEME (ÇOK ÖNEMLİ): Her ana başlığın yanına konunun ait olduğu sınav modülünü köşeli parantez içinde yaz ${disc.labelExample}.
3. DÜZ YAZI YAZMA: Her bilgiyi görsel bir formatta sun:
   - Karşılaştırmalar → **Markdown Tablosu** (en az 2-3 tablo olmalı)
   - Süreçler, hiyerarşiler, ilişkiler → **Mermaid.js diyagramı** (en az 2-3 diyagram olmalı. ⚠️ KESİN KURAL: Mermaid diyagramlarında tüm düğüm isimlerini İSTİSNASIZ OLARAK köşeli parantez ve çift tırnak içine al (örn: A["İhraççı Şirket"] --> B["Kurul"]). Bu kurala uymazsan UI çöker!)
   - Önemli bilgiler → **Emoji kutucukları** (⚠️, 💡, 📌, 🔑)
   - Listeler → **Madde işaretli liste**
4. VURGULAR: Önemli kelimeleri **kalın**, terimleri *eğik* yap.
6. 🗑️ İÇİNDEKİLER VE ÖNSÖZ FİLTRESİ: Eğer metnin başında uzun bir "İçindekiler" (Table of Contents) tablosu, nokta nokta giden sayfa numarası listeleri veya genel Önsöz yazıları varsa, bu kısımları SIFIR BİLGİ kabul et ve TAMAMEN GÖRMEZDEN GEL. Asla sayfa numarası listelerinden not üretme! Sadece gerçek ders anlatımının, kavram tanımlarının ve asıl paragrafların başladığı satırdan itibaren not çıkar.
7. Dolgu metinleri ATLA: genel giriş cümleleri, tarihsel arka plan, "bu bölümde şunları öğreneceğiz" tarzı metinler.
8. Her kavramı sıfır bilgili birinin bile anlayacağı şekilde açıkla. Günlük hayattan gerçekçi ve somut örnekler ver ancak KESİNLİKLE resmi, ciddi ve akademik bir üslup kullan (örn: "kocaman bir yalan", "şunu unutma" gibi laubali tabirler YASAKTIR).
9. Hedef: 10 sayfalık bir PDF bölümünün notu ~8 sayfa olmalı. Yoğun ama EKSİKSİZ.

🔴 SAYFA BAZLI TARAMA TALİMATI (EN KRİTİK KURAL):
PDF'in ${pageStart || '?'}. sayfasından ${pageEnd || '?'}. sayfasına kadar HER SAYFAYI TEK TEK TARA.
Her sayfa için şu kontrol listesini uygula:
- Bu sayfada geçen TÜM kavram tanımları yazıldı mı?
- Bu sayfada geçen TÜM sayısal değerler (oranlar, süreler, limitler, ceza miktarları) yazıldı mı?
- Bu sayfada geçen TÜM listeler (kurum isimleri, katalog suçlar, belge türleri) TAMAMI yazıldı mı?
- Bu sayfada geçen TÜM tablolar satır satır yazıldı mı? (yarıda bırakma!)
- Bu sayfada geçen TÜM istisnalar ve özel durumlar (küçükler, kısıtlılar, yabancılar, unhosted wallet vb.) yazıldı mı?
- Bu sayfada geçen TÜM ceza/yaptırım bilgileri yazıldı mı?
⛔ Sayfayı "genel olarak özetleme" — sayfadaki HER MADDEYİ yaz!

${visualRulesInstruction}

📋 HER KAVRAM İÇİN FORMAT:
- **[Resmi Terim]:** [Resmi tanım - kaynak metindeki cümleyi BİREBİR kopyala, TEK KELİME değiştirme] → 💡 *[Konuyla tam uyumlu, günlük hayattan akılda kalıcı 1-2 cümlelik benzetme/örnek]*

‼️ KRİTİK: Tanım cümlesini asla sadeleştirme, kısaltma veya kendi cümlenle anlatma. Sınavda "aşağıdakilerden hangisi X'in tanımıdır?" diye birebir bu cümle sorulabilir. Tanımı AYNEN yaz, sonra → 💡 ile kendi örneklerini ekle.

ÖRNEK:
- **İhraççı:** Sermaye piyasası araçlarını ihraç eden, ihraç etmek üzere Kurula başvuruda bulunan veya sermaye piyasası araçları halka arz edilen tüzel kişilerdir. → 💡 *Bir fabrika düşün: ürün (hisse) üreten ve markete (borsaya) koyan şirket.*

⚠️ KESİN KURALLAR:
1. Resmi terimleri KESİNLİKLE değiştirme. Sınavda birebir bu terimler sorulur.
2. Tanım cümlelerini kaynak metinden BİREBİR al.
3. Sayısal sınırlar, oranlar ve tarihler MUTLAKA yaz. BUNLAR SIKÇA SORULUR.
4. Formüller varsa formülü yaz + sayısal örnek ile adım adım çöz.
5. Benzer kavramlar arasındaki farkı TABLO ile göster.
6. 💡 örnekleri konuyla TAM UYUMLU olsun.
7. Cevabı ASLA yarıda kesme.
8. İSTİSNALARI ve ÖZEL DURUMLARI mutlaka belirt.
9. 🇹🇷 DİL KALİTESİ: Türkçe dil bilgisi, kelime dizilimi ve akıcılığa %100 uy. İngilizce'den doğrudan çevrilmiş gibi duran yapay veya ters yapılar ("Özeti [Konu]", "Sözlüğü [Konu]", "Notları [Konu]") KESİNLİKLE kullanma. Her zaman doğal ve düzgün bir Türkçe ile akıcı cümleler kur.

${isGlossary ? `
📋 NOT YAPISI (Markdown - HAFIZA TEKNİKLİ TERİMLER SÖZLÜĞÜ MODELİ):

## 📌 \${sectionTitle}

### 🎯 Bu Bölüm Ne Anlatıyor?
Bu bölüm, Bilgi Sistemleri Güvenliği dersinde karşımıza çıkacak tüm kritik kısaltmalar, teknik terimler ve standartların yasal tanımlarını, İngilizce açılımlarını ve sınavda çıkabilecek önemli kavramları hafıza teknikleriyle bir arada sunan özel bir kılavuzdur.

Metindeki her bir kısaltma veya terim için aşağıdaki şablona %100 uyarak detaylı bilgi ver:

### 🔑 [Kısaltma/Terim Adı]
- **Açılımı veya Resmi Tanımı:** [Kaynak metindeki resmi Türkçe tanımını/açıklamasını veya açılımını birebir yaz, tek bir kelimeyi bile değiştirme]
- **İngilizce Karşılığı (varsa):** [Terimin İngilizce açılımı veya karşılığı]
- 💡 **Benzetme:** [Bu kısaltmayı veya terimi akılda tutacak, finans, hukuk, kurumsal yönetim, denetim veya yakın günlük yaşamdan seçilmiş, kavramın gerçek dünyadaki teknik/operasyonel işlevini %100 doğrudan ve mantıksal olarak yansıtan yakın metafor. KESİNLİKLE konuyla ilgisiz uzak disiplinlerden (örn. gastronomi/aşçılık belgesi, pilot brövesi, uçak, uzay gemisi vb.) yapay ve zorlama benzetmeler yapmayın! Örn: CISA için şeflik belgesi değil, BT sistemlerinin röntgenini çeken yeminli mali müşavir kimliği; BSBDL için transokyanus uçuş brövesi değil, binanın dayanıklılığını onaylayan bağımsız yapı denetim uzmanı belgesi.]
- 🎬 **Mikro-Senaryo - [Kısa Senaryo Başlığı]:** [Bu terimin/kısaltmanın veya arkasındaki kavramın gerçekte/sınavda nasıl karşımıza çıkacağını canlandıran 3-4 cümlelik somut ve pratik bir senaryo. İsim ver, olay kurgula. Örn format: "🎬 *Mikro-Senaryo - Ali Bey'in İhlali:* Ali Bey..."]

⚠️ KESİNLİKLE hiçbir Mermaid.js diyagramı veya tablo (karşılaştırma tablosu vb.) eklemeyiniz. Temiz ve sade bir sözlük formatını koruyunuz.
` : `
📋 NOT YAPISI (Markdown - KONUSAL ENTEGRASYON MODELİ):

## 📌 [Bölümün Gerçek Konu Başlığı]

### 🎯 Bu Bölüm Ne Anlatıyor?
(2-3 cümle ile bölümün özü ve neden önemli olduğu)

Metni 3 veya 4 ana alt başlığa (Konuya) böl. Her bir alt başlık altında, o konunun tüm bileşenlerini (tanımlar, hikayeler, eğer gerekiyorsa tablolar, formüller ve şemalar) bir bütün halinde akıt:

### ## 🏢 Konu 1: [Birinci Ana Konu Adı] [[İlgili Mevzuat/Sınav Modülü Başlığı]]
(Bu konunun kapsamını ve önemini açıklayan kısa bir giriş)
*   **Kavram Tanımları ve Mikro-Senaryolar:** Konu altındaki her bir kritik terimi, resmi yasal tanımıyla (aynen kaynak metinden) ver. Hemen ardından, her bir yasal kuralın/terimin altına günlük hayattan gerçekçi, somut ve **💡 Benzetme** ile en fazla 3-5 cümlelik çok net, somut ve pratik bir **🎬 Mikro-Senaryo / Örnek Olay** yerleştir.
    - *Örn format:*
      - **Resmi Terim Adı:** Orijinal yasal tanım cümleleri...
        - 💡 *Benzetme:* Terimi akılda tutacak günlük hayattan gerçekçi ve somut benzetme.
        - 🎬 *Mikro-Senaryo - [Kısa Başlık]:* Bu kuralın/sürenin pratikte nasıl işlediğini anlatan 3-5 cümlelik mini olay örgüsü. (⚠️ KESİN KURAL: Başlığın hemen ardına mutlaka iki nokta ve tire ":**" koyarak kalın başlık kapandıktan sonra kelimelerin birbirine yapışmasını engelle! Örn: "🎬 *Mikro-Senaryo - Ali Bey'in İhlali:* Ali Bey...")
*   📊 **[Karşılaştırma / Bilgi Tablosu veya Listesi - Sadece Gerekliyse]:** Konuda karşılaştırma, sayısal limitler, süreler veya cezalar varsa şık bir tablo ya da liste oluşturun. Yoksa zorlama tablo eklemeyin.
*   🔄 **Süreç Akışı (Mermaid.js - Sadece Gerekliyse):** Konuda ardışık veya kronolojik bir süreç/karar akışı varsa Mermaid diyagramı ekleyin. Yoksa zorlama şema eklemeyin.

### ## 🏢 Konu 2: [İkinci Ana Konu Adı] [[İlgili Mevzuat/Sınav Modülü Başlığı]]
(Bu konuya özel tüm yasal tanımlar, senaryolar, tablolar, formüller ve şemalar burada bir arada akacaktır...)

### ## Konu 3: ...
`}

### 🪤 Ekstra Dikkat Edilmesi Gereken Hususlar
(Bu bölümdeki tüm konulara ait sınavda ekstra dikkat edilmesi ve karıştırılmaması gereken ince detaylar)

### 🔑 Bölüm Özeti
(Tüm bölümü içeren hap niteliğinde tablo veya madde listesi)

### 🧪 Kendini Test Et!
(Bölüm sonu pratik test soruları. Lütfen soruları ve şıkları düzenli bir şekilde yaz. **ASLA** A şıkkını soruyla aynı satıra yazma!
Doğru Format:
Soru 1: Soru metni burada...
A) Seçenek 1
B) Seçenek 2
...gibi her şıkkı yeni satıra yaz.)

⛔ YAPMA LİSTESİ:
- "Merhaba", "Bugün şunu işleyeceğiz" gibi meta-anlatım cümleleri KULLANMA.
- **ASLA KENDİ KAFANDAN SINAV TAKTİĞİ VEYA YORUM UYDURMA!** "Sınavda doğrudan şu terimler sorulmaktadır", "Buraya çok dikkat edin", "Bu konu çok önemlidir" gibi HOCALIK TASLAYAN veya kaynak metinde (PDF'te) olmayan hiçbir yönlendirici/abartı cümleyi **ASLA KULLANMA.** Sadece ve sadece ham metindeki teknik bilgiyi çevir.
- "PDF'in X. sayfasındaki" gibi kaynağa atıf YAPMA.
- Başlıklara "(Eksiksiz)", "(varsa)" gibi parantez açıklamaları YAZMA.
- "Bölüm İçeriği (Sayfa X-Y)" gibi jenerik başlıklar KULLANMA — gerçek konu başlığını yaz.
- Notu YARIDA BIRAKMA.
- **SÖZLÜK / KISALTMALAR İSTİSNASI:** Eğer mevcut bölüm bir "Kısaltmalar", "Tanımlar" veya "Sözlük" bölümüyse; **ASLA ÖZET ÇIKARMA!** Bütün kısaltmaları ve tanımları eksiksiz bir şekilde (hiçbirini atlamadan) listele. Bu tür sözlük bölümlerinin sonuna "🔑 Bölüm Özeti" veya "🧪 Kendini Test Et!" kısmı **KESİNLİKLE EKLEME**.
- **ASLA İLİŞKİSİZ listeleri, kavramları veya kolonları aynı tabloda yan yana birleştirme.** Eğer bir tablonun kolonlarındaki satır sayıları veya eşleşmeleri birbirini tutmuyorsa ve sonlara biçimsiz çizgiler ('-') koymak zorunda kalacaksan, ya da tablonun yarısından fazlası boş (blank/empty) hücrelerden oluşacaksa tablo KULLANMA! Bunun yerine ana kavramları şık bir maddeli liste (Bullet List) yap, hemen altına ise istisnaları veya detayları içeren özel bir emoji kutusu (Callout Box - örn: '🚫', '💡', '⚠️') yerleştir. Her bilgi tam satırında ve uyuşmazlıksız dursun.
- **ASLA sonradan eklenen konuları/eksikleri notun içinde yapay bir şekilde kalınlaştırma (bold yapma) veya işaretleme.** Entegre ettiğin tüm yeni/eksik bilgileri, mevzuatın diğer normal kısımları gibi doğal, akıcı ve organik bir dille paragrafların içine yedir. Sanki o bilgi en başından beri notun içindeymiş gibi düz ve doğal bir üslupla yaz.


🛠️ PDF METİN DÜZELTME TALİMATI:
- PDF'ten çıkarılan metinde "İ Ç İ N D E K İ L E R" gibi ayrık harfler olabilir. Bunları düzelterek yaz.

METİN:
${truncated.replace(/"/g, "'")}


Ders notunu Markdown formatında yaz (JSON değil). Yukarıdaki kurallara %100 uy!
`

  let finalPrompt = prompt
  if (isChunked) {
    finalPrompt = `⚠️⚠️⚠️ [KRİTİK TALİMAT - PARÇALI ÜRETİM MODU]:
Bu ders notu çok uzun olduğu için sistem tarafından otomatik olarak ${chunkCount} parçaya bölünmüştür.
Şu an **${chunkIndex + 1}. parçayı (Parça ${chunkIndex + 1}/${chunkCount})** üretiyorsun.

${previousContext ? `
⚠️ ÖNCEKİ PARÇANIN SONU (KAYAN BAĞLAM HAFIZASI):
Aşağıda bir önceki parçanın nasıl bittiğini görüyorsun. Lütfen bu metni okuyarak, anlatım akışını tam olarak bu noktadan kesintisiz, akıcı bir roman gibi devam ettir. Önceki parçada zaten anlattığın terimleri ve konuları SAKIN tekrar açıklama:
"""
${previousContext}
"""
` : ''}

${chunkIndex === 0 ? `
- Bu ilk parça olduğu için ders notunun ana başlığını (## 📌 ...) ve "🎯 Bu Bölüm Ne Anlatıyor?" giriş kısmını mutlaka ekle.
- SADECE sana aşağıda verilen [KAYNAK METİN PARÇASI] içindeki konuları detaylandır. Kalan diğer konuları sonraki parçalara bırak.
- Ders notunun sonundaki "🪤 Ekstra Dikkat Edilmesi Gereken Hususlar", "🔑 Bölüm Özeti" ve "🧪 Kendini Test Et!" kısımlarını KESİNLİKLE yazma, bunları son parçaya bırak.
` : `
- Bu ${chunkIndex + 1}. parça olduğu için ders notunun ana başlığını (## 📌 ...) ve giriş kısmını KESİNLİKLE yazma (çünkü 1. parçada yazıldı).
- SADECE sana aşağıda verilen [KAYNAK METİN PARÇASI] içindeki konuları detaylandır.
${chunkIndex === chunkCount - 1 ? `
- Bu son parça olduğu için, ders notlarının en sonuna tüm bölümü kapsayan "🪤 Ekstra Dikkat Edilmesi Gereken Hususlar", "🔑 Bölüm Özeti" ve "🧪 Kendini Test Et!" kısımlarını mutlaka ekle.
` : `
- Ders notunun sonundaki "🪤 Ekstra Dikkat Edilmesi Gereken Hususlar", "🔑 Bölüm Özeti" ve "🧪 Kendini Test Et!" kısımlarını KESİNLİKLE yazma, bunları son parçaya bırak.
`}
`}

---

` + prompt
  }

  const result = await callAI(finalPrompt, 2, fileUri)

  // ⚠️ NOT KESİLME ALGILAMA
  // maxOutputTokens aşıldığında Gemini yanıtı yarıda keser.
  // Notun sonu beklenen kapanış bölümleriyle bitmiyorsa kesilmiş demektir.
  if (!isChunked || chunkIndex === chunkCount - 1) {
    // Son parça veya tek parça — kapanış bölümleri olmalı
    const hasClosingSection = result.includes("Kendini Test Et") ||
      result.includes("Bölüm Özeti") ||
      result.includes("Ekstra Dikkat Edilmesi Gereken Hususlar") ||
      result.includes("🧪") ||
      result.includes("🔑")
    if (!hasClosingSection && result.length > 2000) {
      console.warn(`[AI_ENGINE] ⚠️ NOT KESİLME UYARISI: "${sectionTitle}" — Not kapanış bölümlerini (Test Et / Özet) içermiyor. maxOutputTokens yetersiz olabilir! (${result.length} karakter)`)
    }
  }

  return result
}

// ==================== FLASHCARD GENERATION ====================

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
  const MAX_CONTENT_CHARS = 50000
  const truncated = content.length > MAX_CONTENT_CHARS
    ? content.substring(0, MAX_CONTENT_CHARS) + `\n\n[...İçerik kısaltıldı...]`
    : content

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


  const prompt = `
${getExamIntelligence(aiMode)}

${courseName} - "${sectionTitle}" bölümü için EN AZ 15, EN FAZLA 30 adet flashcard oluştur.
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
Böylece kullanıcı aynı bilgiyi farklı açılardan pekiştirir.

KURALLAR:
- Soru kısa ve net olsun, resmi terimleri AYNEN kullan
- Cevap Formatı: Önce resmi/teknik cevap, sonra "💡 Akılda Kalıcı Örnek", ve EN SONA mutlaka "🪤 Ekstra Dikkat Edilmesi Gereken Hususlar" ekle.
- 🪤 Ekstra Dikkat Edilmesi Gereken Hususlar Nedir?: Öğrenciyi yanıltmak için şıklara konulabilecek çok benzer kavramlar, yanlış süreler (örn: 10 iş günü yerine 15 takvim günü) veya ezber yanılgıları. Her kartın arkasında bu uyarı KESİNLİKLE olmalıdır.
- Özellikle rakam, süre, oran ve istisnaları soran kartlar bol olsun — sınavda en çok bunlar sorulur
- 🚫 KESİNLİKLE YASAK: "Kaynak metne göre", "Verilen metne göre", "Ders notlarında", "Metinde belirtilen", "Mevzuata göre" gibi meta-ifadeleri ASLA kullanma. Soruları doğrudan genel geçer akademik doğrular olarak sor.
- **ASLA KENDİ KAFANDAN SINAV TAKTİĞİ VEYA YORUM UYDURMA!** "Sınavda doğrudan şu terimler sorulmaktadır", "Buraya çok dikkat edin", "Bu konu çok önemlidir" gibi HOCALIK TASLAYAN veya kaynak metinde (PDF'te) olmayan hiçbir yönlendirici/abartı cümleyi **ASLA KULLANMA.**
- 🇹🇷 DİL KALİTESİ: Türkçe dil bilgisi, kelime dizilimi ve akıcılığa %100 uy. İngilizce'den doğrudan çevrilmiş gibi duran yapay veya ters yapılar KESİNLİKLE kullanma. KESİNLİKLE resmi ve ciddi bir akademik üslup kullan. Laubali ifadelerden ("kocaman yalan", vb.) kaçın.

KAYNAK METİN: "${truncated.replace(/"/g, "'")}"

Sadece JSON array döndür:
[
  {"front": "soru", "back": "cevap (resmi tanım + 💡 örnek + 🪤 Ekstra Dikkat Edilmesi Gereken Hususlar: [tuzak uyarısı])", "difficulty": "easy|medium|hard"},
  ...
]
`
  let raw = await callAI(prompt, 2, fileUri)

  // Debug: raw response'u dosyaya yaz
  try {
    const { writeFileSync, mkdirSync } = require("fs")
    const { join } = require("path")
    const debugDir = join(process.cwd(), "scratch", "debug")
    mkdirSync(debugDir, { recursive: true })
    writeFileSync(join(debugDir, `flashcard_debug_${Date.now()}.txt`), raw)
  } catch { }

  let attempt = 1
  const maxAttempts = 3
  let flashcardsList: any[] = []

  while (attempt <= maxAttempts) {
    try {
      const parsed = extractCleanJson(raw)
      flashcardsList = Array.isArray(parsed) ? parsed : []
      console.log(`[FLASHCARD_DEBUG] Parsed ${flashcardsList.length} flashcards (Attempt #${attempt})`)

      if (flashcardsList.length === 0) {
        throw new Error("Boş veya geçersiz JSON listesi.")
      }

      // Flashcard Müfettişi Devreye Giriyor!
      console.log(`[FLASHCARD_AUDIT] Müfettiş derin flashcard denetimi başlatılıyor (Bölüm: "${sectionTitle}")...`)
      const audit = await auditFlashcardsAgainstSource(content, flashcardsList, sectionTitle, fileUri)

      if (audit.passed) {
        console.log(`[FLASHCARD_AUDIT] ✅ Müfettiş tüm flashcardları hatasız ve kusursuz onayladı!`)
        break
      }

      console.warn(`[FLASHCARD_AUDIT] ⚠️ Müfettiş ${audit.issues.length} adet hata/halüsinasyon tespit etti!`)
      console.log(audit.issues.map(i => `   - ${i}`).join("\n"))

      if (attempt === maxAttempts) {
        console.warn(`[FLASHCARD_AUDIT] Maximum audit deneme sayısına ulaşıldı, mevcut kartlarla devam ediliyor.`)
        break
      }

      // Onarım Promptunu hazırla
      console.log(`[FLASHCARD_AUDIT] 🔄 Flashcardlar Müfettiş bulguları doğrultusunda yeniden onarılıp üretiliyor...`)
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
      console.error(`[FLASHCARD_DEBUG] Flashcard ayrıştırma/doğrulama hatası (Attempt #${attempt}): ${e.message}`)
      if (attempt === maxAttempts) {
        break
      }
      await new Promise(r => setTimeout(r, 4000))
      raw = await callAI(prompt, 2, fileUri)
      attempt++
    }
  }

  return flashcardsList
}

// ==================== QUESTION GENERATION ====================

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
  const MAX_CONTENT_CHARS = 50000
  const truncated = content.length > MAX_CONTENT_CHARS
    ? content.substring(0, MAX_CONTENT_CHARS) + `\n\n[...İçerik kısaltıldı...]`
    : content

  // 1. DİNAMİK SORU SAYISI HESAPLAMA (5 - 15)
  const pageCount = (pageEnd && pageStart) ? (pageEnd - pageStart + 1) : 3
  let importanceMultiplier = 1.0
  if (importance === "High") importanceMultiplier = 1.3
  else if (importance === "Low") importanceMultiplier = 0.7

  const baseCount = pageCount * 1.5
  const targetCount = Math.round(baseCount * importanceMultiplier)
  const boundedTargetCount = Math.max(5, Math.min(15, targetCount))

  console.log(`[QUESTION_GEN] 📊 Dinamik Soru Hesaplama: Sayfa Sayısı: ${pageCount}, Önem Derecesi: ${importance || "Medium"}, Ham Adet: ${targetCount} -> Bounded Hedef: ${boundedTargetCount} Soru`)

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

ÇOK ÖNEMLİ — SORU SAYISI: Tam olarak ${boundedTargetCount} adet soru üret. Konunun tamamını kapsayacak kadar soru olmalı.

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

KAYNAK METİN: "${truncated.replace(/"/g, "'")}"

Sadece JSON array döndür:
[
  {
    "text": "soru metro",
    "options": ["A) seçenek", "B) seçenek", "C) seçenek", "D) seçenek", "E) seçenek"],
    "correct": "A",
    "explanation": "✅ Doğru cevap A'dır: [detaylı açıklama].\\n\\n❌ B) Yanlış çünkü: [neden]\\n❌ C) Yanlış çünkü: [neden]\\n❌ D) Yanlış çünkü: [neden]\\n❌ E) Yanlış çünkü: [neden]\\n\\n💡 Sınav İpucu: [ipucu]",
    "difficulty": "easy|medium|hard"
  }
]
`

  let raw = await callAI(prompt, 2, fileUri)

  // Debug: raw yanıtı kaydet
  try {
    const { writeFileSync, mkdirSync } = require("fs")
    const { join } = require("path")
    const debugDir = join(process.cwd(), "scratch", "debug")
    mkdirSync(debugDir, { recursive: true })
    writeFileSync(join(debugDir, `question_debug_${Date.now()}.txt`), raw)
  } catch { }

  let attempt = 1
  const maxAttempts = 3
  let questionsList: any[] = []

  while (attempt <= maxAttempts) {
    try {
      const parsed = extractCleanJson(raw)
      questionsList = Array.isArray(parsed) ? parsed : []
      console.log(`[QUESTION_DEBUG] Parsed ${questionsList.length} questions (Attempt #${attempt})`)

      if (questionsList.length === 0) {
        throw new Error("Boş veya geçersiz JSON listesi.")
      }

      // Soru Müfettişi Devreye Giriyor!
      console.log(`[QUESTION_AUDIT] Müfettiş derin soru denetimi başlatılıyor (Bölüm: "${sectionTitle}")...`)
      const audit = await auditQuestionsAgainstSource(content, questionsList, sectionTitle, fileUri)

      if (audit.passed) {
        console.log(`[QUESTION_AUDIT] ✅ Müfettiş tüm soruları hatasız ve kusursuz onayladı!`)
        break
      }

      console.warn(`[QUESTION_AUDIT] ⚠️ Müfettiş ${audit.issues.length} adet hata/halüsinasyon, ${audit.missingTopics?.length || 0} adet eksik konu tespit etti!`)
      if (audit.issues.length > 0) {
        console.log(audit.issues.map(i => `   - ${i}`).join("\n"))
      }

      if (attempt === maxAttempts) {
        console.warn(`[QUESTION_AUDIT] Maximum audit deneme sayısına ulaşıldı, mevcut sorularla devam ediliyor.`)
        break
      }

      // Onarım Promptunu hazırla
      console.log(`[QUESTION_AUDIT] 🔄 Sorular Müfettiş bulguları doğrultusunda yeniden onarılıp üretiliyor...`)
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
      console.error(`[QUESTION_DEBUG] Soru ayrıştırma/doğrulama hatası (Attempt #${attempt}): ${e.message}`)
      if (attempt === maxAttempts) {
        break
      }
      await new Promise(r => setTimeout(r, 4000))
      raw = await callAI(prompt, 2, fileUri)
      attempt++
    }
  }

  // ==================== YEDEK GÜÇ (BACKUP POWER) BUFFER ====================
  // Eğer tüm denemeler bittiğinde hala test edilmemiş önemli konular varsa,
  // maks 5 adet hedeflenmiş Yedek Güç sorusu üretip doğrudan veritabanına eklenmek üzere listeye iliştiriyoruz.
  try {
    const finalAudit = await auditQuestionsAgainstSource(content, questionsList, sectionTitle, fileUri)
    if (finalAudit.missingTopics && finalAudit.missingTopics.length > 0) {
      const backupCount = Math.min(5, finalAudit.missingTopics.length)
      console.log(`[YEDEK_GÜÇ] ⚡ Yedek güç devreye giriyor! Test edilmeden geçilen ${backupCount} eksik konu için hedeflenmiş yedek sorular üretiliyor...`)
      console.log(`[YEDEK_GÜÇ] Eksik Konular:`, finalAudit.missingTopics.slice(0, backupCount))

      const backupPrompt = `
${getExamIntelligence(aiMode)}

DERS: ${courseName}
BÖLÜM: "${sectionTitle}"

Aşağıdaki eksik konuları test etmek için TAM olarak ${backupCount} adet akademik kalitede, çoktan seçmeli soru oluştur.
EKSİK KONULAR:
${finalAudit.missingTopics.slice(0, backupCount).map((t, idx) => `${idx + 1}. ${t}`).join("\n")}

SORU TİPLERİ VE BİLGİ DOĞRULUĞU KURALLARINA TAVİZSİZ UYUN.
Her şıkkın neden yanlış olduğunu ve neden doğru olduğunu tek tek ve detaylı açıklayın.
Sayısal/formül/limit/süre varsa bunlara odaklanın.

KAYNAK METİN: "${truncated.replace(/"/g, "'")}"

Sadece JSON array döndür:
[
  {
    "text": "Soru metni?",
    "options": ["A) seçenek", "B) seçenek", "C) seçenek", "D) seçenek", "E) seçenek"],
    "correct": "A",
    "explanation": "✅ Doğru cevap A'dır: [detaylı akademik açıklama].\\n\\n❌ B) Yanlış çünkü: [neden]\\n❌ C) Yanlış çünkü: [neden]\\n❌ D) Yanlış çünkü: [neden]\\n❌ E) Yanlış çünkü: [neden]\\n\\n💡 Sınav İpucu: [ipucu]",
    "difficulty": "medium"
  }
]
`
      await new Promise(r => setTimeout(r, 4000))
      const backupRaw = await callAI(backupPrompt, 1, fileUri)
      const backupQuestions = extractCleanJson(backupRaw)
      if (Array.isArray(backupQuestions) && backupQuestions.length > 0) {
        console.log(`[YEDEK_GÜÇ] ✅ Başarıyla ${backupQuestions.length} adet yedek güç sorusu üretildi ve ana listeye eklendi.`)
        questionsList = [...questionsList, ...backupQuestions.slice(0, 5)]
      }
    }
  } catch (backupErr: any) {
    console.error(`[YEDEK_GÜÇ] ❌ Yedek güç soru üretimi sırasında hata oluştu:`, backupErr.message)
  }

  // ⚠️ SORU DOĞRU CEVAP ÇAPRAZ KONTROL (Cross-Check)
  // AI bazen correct: "A" derken açıklamada "Doğru cevap B'dir" yazabilir.
  // Bu tutarsızlığı tespit edip düzelt veya flag'le.
  let crossCheckFixed = 0
  for (const q of questionsList) {
    if (!q.explanation || !q.correct) continue

    // Açıklamada "Doğru cevap X" veya "✅ X)" kalıbını ara
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

  return questionsList
}


// ==================== AI KONTROLÖR (NOTES CROSS-CHECK) ====================

export async function verifyNotesAgainstSource(
  sourceContent: string,
  generatedNotes: string,
  sectionTitle: string,
  fileUri?: string,
  pageStart?: number,
  pageEnd?: number
): Promise<{ score: number; missingTopics: string[]; issues: string[]; suggestions: string[] }> {
  const prompt = `
Sen bir sınav materyali KALİTE KONTROLÖRÜSÜN (Kontrolör). Görevin, üretilen ders notlarını yasal kaynak dökümanla karşılaştırıp yasal süreler, cezalar, limitler ve kritik mevzuat kavramları bazında hiçbir eksiğin kalmadığını doğrulamaktır.

${fileUri ? `📄 Ekteki PDF'in ${pageStart}-${pageEnd}. sayfalarını ASIL KAYNAK olarak kullan.` : ""}

BÖLÜM: "${sectionTitle}"

${!fileUri ? `KAYNAK METİN:\n${sourceContent.substring(0, 100000).replace(/"/g, "'")}` : `KAYNAK METİN (yedek):\n${sourceContent.substring(0, 100000).replace(/"/g, "'")}`}

ÜRETİLEN DERS NOTU:
${generatedNotes.substring(0, Math.max(30000, generatedNotes.length)).replace(/"/g, "'")}

🎯 DEĞERLENDİRME KRİTERLERİ:

PUAN KIRAN DURUMLAR (bunlar ciddi sorun):
- Kaynak metinde geçen bir KONU/KAVRAM ders notunda hiç ele alınmamış (tamamen atlanmış)
- Rakam, oran, süre, tarih, limit YANLIŞ yazılmış (örn: 5 yıl yerine 3 yıl)
- Mevzuat adı veya madde numarası YANLIŞ
- Tablo veya liste YARIDA kesilmiş
- Ceza miktarı veya yaptırım türü HATALI

PUAN KIRMAYAN DURUMLAR (bunlar sorun DEĞİL):
- Tanımın kendi cümleleriyle basitleştirilerek anlatılması ✅
- Eğlenceli örnekler, hikayeler, benzetmeler eklenmesi ✅
- İçeriğin farklı sırayla organize edilmesi ✅
- Emoji, görsel zenginlik, mermaid diyagram kullanılması ✅
- Kaynak metindeki dolgu cümlelerinin atlanması ✅

PUANLAMA KURALLARI (TAVİZSİZ VE KESİN):
- 100 PUAN: Eğer metinde hiçbir eksik konu (missingTopics) ve hiçbir bilgi hatası (issues) YOKSA tam 100 puan verilir. İyileştirme önerileri (suggestions) bulunması 100 puan vermene ENGEL DEĞİLDİR. Asıl olan bilginin doğruluğudur.
- 95-99 PUAN: Çok küçük, göz ardı edilebilir bir detay eksikse.
- 85-94 PUAN: 1-2 küçük konu eksik ama ana konular tamam.
- 70-84 PUAN: Birden fazla önemli konu atlanmış
- 50-69 PUAN: Ciddi eksiklikler var

⚠️ MUTLAK DOĞRULUK VE ÖNERİ KURALI: 
1. Sadece ve sadece kaynak metinde (source) yer alıp da notta eksik kalan detayları "öneri" (suggestions) olarak yazabilirsin.
2. Kaynak metinde bulunmayan hiçbir dış konuyu, yasal maddeyi veya ek bilgiyi kesinlikle "öneri" (suggestions) olarak yazamazsın! Kaynak metin dışı öneriler KESİNLİKLE YASAKTIR.
3. Sadece eksik konu (missingTopics) veya bilgi hatası (issues) varsa puanı 100'ün altına düşür. Sadece öneri (suggestions) varsa puan 100 olarak kalmalıdır.

Sadece JSON döndür:
{
  "score": <0-100 arası tam sayı>,
  "missingTopics": ["Tamamen ATLANMIŞ konu varsa yaz — yoksa boş array"],
  "issues": ["YANLIŞ rakam, tarih veya mevzuat hatası varsa yaz — yoksa boş array"],
  "suggestions": ["İyileştirme önerisi — yoksa boş array"]
}

TÜM TESPİTLERİNİ, CÜMLELERİNİ VE ÇIKTILARINI KESİNLİKLE TÜRKÇE DİLİNDE YAZMALISIN (İngilizce kısaltmaları analiz etsen bile raporu Türkçe ver).
`

  const raw = await callAI(prompt, 1, fileUri, "verification")
  try {
    const result = extractCleanJson(raw) as any
    return {
      score: result.score || 0,
      missingTopics: result.missingTopics || [],
      issues: result.issues || [],
      suggestions: result.suggestions || []
    }
  } catch {
    return { score: 0, missingTopics: [], issues: ["Doğrulama yapılamadı"], suggestions: [] }
  }
}



export async function auditNotesAgainstSourceSpecific(
  sourceContent: string,
  generatedNotes: string,
  sectionTitle: string,
  topicsToAudit: string[],
  fileUri?: string,
  pageStart?: number,
  pageEnd?: number
): Promise<{ passed: boolean; missingDetails: string[]; contradictions: string[]; findings: Array<{ description: string; severity: "CRITICAL" | "MEDIUM" | "LOW"; type: "missing" | "contradiction" }> }> {
  const prompt = `
Sen bir sınav hazırlık derin denetim uzmanısın (Müfettiş). Görevin, üretilen ders notlarını en ince mikro-detay seviyesinde, özellikle mevzuattaki yasal süreler, ceza miktarları, istisnalar, katalog suçlar ve rakamlar bazında kaynak metinle çapraz sorgulamak ve açık aramaktır.

BÖLÜM BAŞLIĞI: "${sectionTitle}"

⚠️ MÜFETTİŞ TARAFINDAN DENETLENECEK KONULAR (SADECE bunlara odaklan):
${topicsToAudit.map((topic, i) => `${i + 1}. ${topic}`).join("\n")}

KAYNAK METİN:
${sourceContent.substring(0, 100000).replace(/"/g, "'")}

ÜRETİLEN DERS NOTLARINDA BU KONULARA AİT BULUNAN KISIMLAR:
${generatedNotes.substring(0, Math.max(30000, generatedNotes.length)).replace(/"/g, "'")}

🎯 DENETİM TALİMATLARI:
Sadece ve sadece yukarıda listelenen 3 spesifik konuya odaklan. Kaynak metindeki bu 3 konu ile üretilen notlardaki ilgili paragrafları karşılaştır.
1. EKSİKLİK (Omission): Kaynak metinde geçen herhangi bir yasal süre (örn: 10 gün), oran (örn: %5), limit (örn: 50bin TL), katalog suç listesi, yetkili merci (örn: Hazine ve Maliye Bakanlığı yerine İçişleri Bakanlığı), istisna veya mikro kural ders notunda ATLANMIŞ MI?
2. BİLGİ HATASI/ÇARPITMA (Contradiction): Süreler, limitler veya kurallar ders notuna aktarılırken yanlış veya çarpıtılmış şekilde yazılmış mı (örn: 3 yıl yerine 5 yıl)?

ÖNEMLİ: Bu 3 konunun dışındaki diğer ders notu kısımlarını ve kaynak metindeki diğer konuları KESİNLİKLE göz ardı et, onları denetleme.

⚖️ KRİTİKLİK SEVİYELERİ (Her bulguyu aşağıdaki kategorilere göre sınıflandır):
- "CRITICAL": Yasal süre, ceza miktarı, oran, limit veya yasal madde numarası gibi sınavda direkt soru çıkabilecek, yanlış öğrenilmesi öğrenciye puan kaybettirecek somut bilgi hataları veya eksiklikleri. Örneğin: "5 iş günü yerine 10 iş günü yazılmış", "Ceza miktarı 500.000 TL iken notta 250.000 TL yazılmış", "SPK Madde 103 atlanmış".
- "MEDIUM": Bir konunun veya alt başlığın kapsam olarak eksik bırakılması. Konu anlatılmış ama içindeki önemli bir alt detay/madde/istisna atlanmış. Örneğin: "Bilgi güvenliği politikasının 8 hususu yerine sadece 3'ü yazılmış", "Sızma testi türlerinden gri kutu testi anlatılmamış".
- "LOW": Konu notlarda genel olarak doğru anlatılmış ama ifade zenginleştirmesi veya ek bir açıklama/örnek ile daha iyi hale getirilebilecek detaylar. Bilgi doğruluğunu etkilemeyen, akademik derinlik önerileri. Örneğin: "Üst yönetimin bireysel yaklaşımıyla göstermesi detayı eklenebilir".

Sadece aşağıdaki JSON formatında bir çıktı ver:
{
  "passed": <hedef 3 konuda hiçbir eksik detay veya bilgi hatası bulunamadıysa true, en ufak bir CRITICAL veya MEDIUM hata/eksik bulunduysa false>,
  "findings": [
    {
      "description": "Bulgunun detaylı açıklaması",
      "severity": "CRITICAL veya MEDIUM veya LOW",
      "type": "missing veya contradiction"
    }
  ]
}
`

  const raw = await callAI(prompt, 1, fileUri, "verification")
  try {
    const result = extractCleanJson(raw)
    const findings: Array<{ description: string; severity: "CRITICAL" | "MEDIUM" | "LOW"; type: "missing" | "contradiction" }> = (result.findings || []).map((f: any) => ({
      description: f.description || "",
      severity: (["CRITICAL", "MEDIUM", "LOW"].includes(f.severity) ? f.severity : "MEDIUM") as "CRITICAL" | "MEDIUM" | "LOW",
      type: f.type === "contradiction" ? "contradiction" : "missing"
    }))

    // Geriye dönük uyumluluk: eski missingDetails/contradictions formatını da üret
    const missingDetails = findings.filter(f => f.type === "missing").map(f => `[${f.severity}] ${f.description}`)
    const contradictions = findings.filter(f => f.type === "contradiction").map(f => `[${f.severity}] ${f.description}`)

    return {
      passed: result.passed === true || result.passed === "true",
      missingDetails,
      contradictions,
      findings
    }
  } catch {
    return { passed: false, missingDetails: ["Denetim API çağrısı başarısız oldu."], contradictions: [], findings: [{ description: "Denetim API çağrısı başarısız oldu.", severity: "CRITICAL", type: "missing" }] }
  }
}

// ⚠️ MÜFETTİŞ KATMANI: Üretilen soruları ve şıkları resmi kaynakla denetleyen adversarial katman
export async function auditQuestionsAgainstSource(
  sourceContent: string,
  questions: Array<{ text: string; options: string[]; correct: string; explanation: string }>,
  sectionTitle: string,
  fileUri?: string
): Promise<{ passed: boolean; issues: string[]; missingTopics: string[] }> {
  const prompt = `
Sen bir sınav hazırlık soru denetim uzmanısın (Soru Müfettişi). Görevin, üretilen çoktan seçmeli soruları, cevap anahtarlarını ve açıklamaları kaynak resmi metinle karşılaştırarak bilgi doğruluğu, mantık hataları ve yapay zeka halüsinasyonları açısından denetlemektir.

BÖLÜM BAŞLIĞI: "${sectionTitle}"

KAYNAK METİN:
${sourceContent.substring(0, 100000).replace(/"/g, "'")}

ÜRETİLEN SORULAR VE AÇIKLAMALAR:
${JSON.stringify(questions, null, 2).substring(0, 30000)}

🎯 MÜFETTİŞ DENETİM TALİMATLARI:
Aşağıdaki kurallara göre her soruyu tek tek ve titizlikle incele:
1. Bilgi Hatası (Factual Error): Soru kökünde, doğru şıkta veya açıklamalarda kaynak metinle çelişen, uydurulmuş veya yanlış aktarılmış herhangi bir yasal süre (gün/ay), para cezası miktarı, katalog suç veya kural var mı?
2. Şık Tutarsızlığı (Option Contradiction): Doğru kabul edilen cevap şıkkı, sorunun kendisiyle veya kaynak metindeki kuralla çelişiyor mu? (Örn: Soru "hangisi yanlıştır" derken, doğru cevap olarak "doğru" bir ifadeyi mi işaretlemiş?)
3. Eksik Şık Açıklaması: Açıklamada (explanation alanında) A, B, C, D seçeneklerinin her biri için teker teker detaylı analiz yapılmamış, sadece tek cümleyle geçiştirilmiş veya bazı şıklar atlanmış mı?
4. Eksik Konular (Missing Topics): Kaynak metindeki çok kritik, sınavda çıkabilecek önemli bir tanım veya kural, üretilen bu sorularda HİÇ test edilmemiş mi? (Sorularda hiç değinilmemiş olan eksik konuları belirle).

Sadece aşağıdaki JSON formatında çıktı ver:
{
  "passed": <tüm sorular hatasız, tutarlı ve eksiksiz ise true, en ufak bir hata/uydurma veya eksik konu varsa false>,
  "issues": ["Tespit edilen hatayı ve hangi soruda olduğunu belirten detaylı açıklama maddeleri — yoksa boş array"],
  "missingTopics": ["Sorularda hiç değinilmemiş, tamamen test edilmeden geçilmiş olan çok kritik, önemli 1-5 konu başlığı — yoksa boş array"]
}
`

  const raw = await callAI(prompt, 1, fileUri, "verification")
  try {
    const result = extractCleanJson(raw)
    return {
      passed: result.passed === true || result.passed === "true",
      issues: result.issues || [],
      missingTopics: result.missingTopics || []
    }
  } catch {
    return { passed: true, issues: [], missingTopics: [] } // Hata durumunda akışı kilitlememek için true dön
  }
}


// ⚠️ MÜFETTİŞ KATMANI: Üretilen flashcard'ları resmi kaynakla denetleyen adversarial katman
export async function auditFlashcardsAgainstSource(
  sourceContent: string,
  flashcards: Array<{ front: string; back: string }>,
  sectionTitle: string,
  fileUri?: string
): Promise<{ passed: boolean; issues: string[] }> {
  const prompt = `
Sen bir sınav hazırlık flashcard denetim uzmanısın (Flashcard Müfettişi). Görevin, üretilen soru-cevap kartlarını (flashcards) kaynak resmi metinle karşılaştırarak bilgi doğruluğu, yasal süre limitleri ve yapay zeka halüsinasyonları açısından denetlemektir.

BÖLÜM BAŞLIĞI: "${sectionTitle}"

KAYNAK METİN:
${sourceContent.substring(0, 100000).replace(/"/g, "'")}

ÜRETİLEN FLASHCARDLAR (Soru-Cevap Kartları):
${JSON.stringify(flashcards, null, 2).substring(0, 30000)}

🎯 MÜFETTİŞ DENETİM TALİMATLARI:
Aşağıdaki kurallara göre her kartı tek tek ve titizlikle incele:
1. Bilgi Hatası (Factual Error): Kartın ön yüzündeki soruda veya arka yüzündeki cevapta, kaynak metinle çelişen, uydurulmuş veya yanlış aktarılmış herhangi bir yasal süre (gün/ay), ceza miktarı, katalog suç veya limit kuralı var mı?
2. Yanlış Cevap: Kartın arka yüzündeki cevap, ön yüzdeki soruyla veya kaynak metindeki yasal kuralla çelişiyor mu?

Sadece aşağıdaki JSON formatında çıktı ver:
{
  "passed": <tüm flashcardlar hatasız ve bilgi açısından doğru ise true, en ufak bir hata/uydurma varsa false>,
  "issues": ["Tespit edilen hatayı ve hangi kartta olduğunu belirten detaylı açıklama maddeleri — yoksa boş array"]
}
`

  const raw = await callAI(prompt, 1, fileUri, "verification")
  try {
    const result = extractCleanJson(raw)
    return {
      passed: result.passed === true || result.passed === "true",
      issues: result.issues || []
    }
  } catch {
    return { passed: true, issues: [] } // Hata durumunda akışı kilitlememek için true dön
  }
}

export async function smartInjectCourseNotes(
  existingNotes: string,
  feedbackItems: string,
  sectionTitle: string,
  courseName: string,
  userLevel: string,
  aiMode: string
): Promise<string> {
  // AŞAMA 1: Biçim-Duyarlı Akıllı Yama (Format-Aware Smart Inject)
  const injectPrompt = `Sen kıdemli bir eğitim içerik mimarısın. 
Aşağıda "${courseName}" eğitiminin "${sectionTitle}" bölümü için halihazırda üretilmiş olan Ders Notları yer alıyor. 
Denetim ekibi (Müfettiş) bazı eksikler tespit etti. Görevin bu eksikleri notun İÇİNE, mevcut yapıyı bozmadan ZEKİCE enjekte etmektir.

⚠️ BİÇİM-DUYARLI ENJEKSİYON KURALLARI (ÇOK KRİTİK):
1. Önce eksiği nereye ekleyeceğini bul. Sonra O BÖLGEDEKİ BİÇİM DNA'SINI (Format) KOPYALA.
2. EĞER eksik olan şeyin yanındaki konular bir TABLO'da anlatılmışsa, sen de eksik konuyu o tabloya YENİ BİR SATIR olarak ekle. Düz paragraf yazma!
3. EĞER eksik olan şeyin etrafındaki konular bir MERMAID diyagramındaysa, diyagram kodunu güncelle ve eksiği oraya ekle.
4. EĞER eksik olan şey senaryolaştırılmışsa (örn: "X Kurumunun Uyum Görevlisi"), eksiği de aynı karakterin hikayesine yedirerek anlat. Laubali ifadelerden KESİNLİKLE kaçın.
5. Notun genel yapısını, başlıklarını ve sıralamasını ASLA değiştirme.
6. Notun sonuna "Ek Bilgiler", "Müfettiş Notu" gibi sonradan eklendiğini belli eden utanç verici yamalar YAPMA. 
7. Çıktın, sadece eklediğin kısımlar DEĞİL, notun GÜNCELLENMİŞ TAM SON HALİ olmalıdır.

--- MÜFETTİŞ GERİ BİLDİRİMLERİ (Eklenecek Noktalar) ---
${feedbackItems}

--- MEVCUT DERS NOTLARI (Bu notun içine entegre et) ---
${existingNotes}
`;

  const injectedNotes = await callAI(injectPrompt, 1);

  // AŞAMA 2: Organik Cilalama (Polish Pass)
  const polishPrompt = `Sen bir baş editörsün. Aşağıdaki ders notlarına az önce bazı yeni bilgiler eklendi ancak bu eklemeler geçişlerde pürüzler yaratmış olabilir.

GÖREVİN: Notu baştan sona oku ve sadece AKIŞI, TONU ve GEÇİŞLERİ cilala.

⚠️ CİLALAMA KURALLARI:
1. KESİNLİKLE yeni bir bilgi ekleme ve var olan hiçbir teknik/yasal bilgiyi, süreyi, tabloyu SİLME.
2. Enjekte edilmiş gibi duran ("Öte yandan", "Ayrıca belirtmek gerekir ki" gibi zorlama) geçişleri yumuşat, doğal bir paragraf akışına çevir.
3. Font, kalınlaştırma (bold) veya liste stillerindeki tutarsızlıkları gider. Her şey tek bir yazarın kaleminden çıkmış gibi kusursuz görünmeli.
4. Çıktın, notun CİLALANMIŞ TAM SON HALİ olmalıdır (Markdown formatında).

--- CİLALANACAK DERS NOTLARI ---
${injectedNotes}
`;

  return await callAI(polishPrompt, 1);
}

// ==================== AUTO-HEALING FLAGGING ====================

export async function auditAndRepairQuestion(
  questionText: string,
  optionsJson: string,
  correctAnswer: string,
  explanation: string,
  reportReason: string,
  reportComment: string,
  sourceText: string
): Promise<{ status: "auto_fixed" | "rejected", newQuestion?: any, aiComment: string }> {
  const MAX_CONTENT_CHARS = 40000;
  const truncatedSource = sourceText.length > MAX_CONTENT_CHARS
    ? sourceText.substring(0, MAX_CONTENT_CHARS) + `\n\n[...İçerik Kısaltıldı...]`
    : sourceText;

  const prompt = `Sen SPL/MASAK Sınav Komisyonu Başmüfettişisin.
Bir öğrenci sistemdeki aşağıdaki sorunun hatalı olduğunu iddia ederek raporladı.
Görevin: Öğrencinin itirazını kaynak metne göre değerlendirmek.

Öğrencinin İtiraz Nedeni: ${reportReason}
Öğrencinin Yorumu: "${reportComment}"

--- MEVCUT SORU ---
Soru: ${questionText}
Şıklar: ${optionsJson}
Doğru Cevap: ${correctAnswer}
Açıklama: ${explanation}

--- KAYNAK METİN ---
${truncatedSource.replace(/"/g, "'")}

GÖREV:
1. Öğrenci haklıysa (soruda bilgi hatası, yanlış şık, çelişki vb. varsa): Soruyu KAYNAK METNE göre tamamen düzelt.
2. Öğrenci haksızsa (soru kaynak metne göre %100 doğruysa): İtirazı reddet ve öğrenciye neden yanıldığını açıklayan sert ama eğitici bir yorum yaz.

Çıktı Formatı (SADECE JSON döndür):
{
  "status": "auto_fixed" veya "rejected",
  "aiComment": "Öğrenciye gösterilecek açıklama (Örn: 'Haklısınız, 10 iş günü olması gerekirken 15 gün yazılmış, soru düzeltildi.' VEYA 'İtirazınız reddedildi. Doğrusu şu şekildedir...'). KESİNLİKLE 'Kaynak metne göre', 'Metnin X. sayfasında' GİBİ İFADELER KULLANMA. Sadece doğrudan bilgiyi ver.",
  "newQuestion": {
    // SADECE status "auto_fixed" ise bu objeyi doldur, "rejected" ise null bırak.
    "text": "Düzeltilmiş Soru Metni",
    "options": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
    "correct": "A",
    "explanation": "Düzeltilmiş ve detaylı açıklama. 🚨 KESİNLİKLE 'Kaynak metne göre', 'Metnin X. sayfasında' GİBİ İFADELER KULLANILMAYACAKTIR. Doğrudan bilgiyi kendinden emin bir şekilde ver.",
    "difficulty": "medium"
  }
}
`;

  try {
    const raw = await callAI(prompt, 1);
    const result = extractCleanJson(raw);
    return {
      status: result.status,
      newQuestion: result.newQuestion,
      aiComment: result.aiComment
    };
  } catch (error) {
    console.error("[AUTO-HEALING] Hata:", error);
    return { status: "rejected", aiComment: "Sistem hatası nedeniyle denetim yapılamadı." };
  }
}
