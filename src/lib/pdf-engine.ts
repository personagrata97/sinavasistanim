import PDFParser from "pdf2json"
import axios from "axios"

// pdf2json ile metin çıkarma - pdfjs-dist'ten çok daha güvenilir
// PDF'teki her sayfanın metnini ayrı ayrı çıkarır

export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser()
    
    parser.on("pdfParser_dataReady", (data: any) => {
      resolve(data.Pages?.length || 1)
    })
    
    parser.on("pdfParser_dataError", (err: any) => {
      console.error("[PDF_ENGINE] Page count error:", err)
      resolve(1)
    })
    
    parser.parseBuffer(buffer)
  })
}



// Tüm sayfaların metnini tek seferde çıkar (çok daha hızlı!)
export async function extractAllText(buffer: Buffer): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser()
    
    parser.on("pdfParser_dataReady", (data: any) => {
      const pages = data.Pages || []
      const texts: string[] = []
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const pageTexts = page.Texts || []
        
        const textParts: string[] = []
        let lastY = -1
        
        for (const textItem of pageTexts) {
          const t = textItem.R?.[0]?.T || ""
          let decoded: string
          try { decoded = decodeURIComponent(t) } catch { decoded = t }
          const y = Math.round(textItem.y * 10)
          
          if (decoded.trim().length === 0) continue
          
          if (lastY >= 0 && Math.abs(y - lastY) > 1) {
            textParts.push("\n")
          }
          
          textParts.push(decoded)
          lastY = y
        }
        
        const fullText = textParts.join(" ")
          .replace(/ +/g, " ")
          .replace(/\n +/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim()
        
        texts.push(fullText)
      }
      
      const totalChars = texts.reduce((sum, t) => sum + t.length, 0)
      const nonEmpty = texts.filter(t => t.length > 20).length
      console.log(`[PDF_ENGINE] Extracted ${pages.length} pages: ${totalChars} total chars, ${nonEmpty} non-empty pages`)
      
      // ⚠️ NON-SEARCHABLE PDF ALGILAMA
      // Taranmış/resim PDF'lerde text layer olmaz → toplam karakter çok düşük olur
      if (pages.length > 0 && totalChars < 500) {
        console.warn(`[PDF_ENGINE] ⚠️ NON-SEARCHABLE PDF ALGILANDI! ${pages.length} sayfa var ama sadece ${totalChars} karakter çıkarıldı.`)
        console.warn(`[PDF_ENGINE] Bu PDF muhtemelen tarayıcıdan geçirilmiş bir görüntü PDF'idir. Metin çıkarma başarısız olabilir.`)
      } else if (pages.length > 5 && nonEmpty < pages.length * 0.3) {
        console.warn(`[PDF_ENGINE] ⚠️ KISMEN NON-SEARCHABLE PDF! ${pages.length} sayfanın sadece ${nonEmpty} tanesinde anlamlı metin bulundu.`)
      }
      
      resolve(texts)
    })
    
    parser.on("pdfParser_dataError", (err: any) => {
      const errMsg = String(err?.parserError || err || "")
      
      // ŞİFRELİ PDF ALGILAMA
      if (errMsg.toLowerCase().includes("password") || errMsg.toLowerCase().includes("encrypted")) {
        console.error(`[PDF_ENGINE] 🔒 ŞİFRELİ PDF! Bu PDF parola korumalıdır ve işlenemez.`)
        resolve([]) // Boş dizi dön — upstream'de algılanacak
        return
      }
      
      console.error("[PDF_ENGINE] Fatal extraction error:", err)
      resolve([])
    })
    
    parser.parseBuffer(buffer)
  })
}

// Non-searchable PDF durumunu kontrol et (upload route'dan çağrılır)
export function checkPdfQuality(pageTexts: string[], totalPages: number): { 
  isNonSearchable: boolean; 
  isPartiallySearchable: boolean; 
  message: string | null 
} {
  const totalChars = pageTexts.reduce((sum, t) => sum + t.length, 0)
  const nonEmpty = pageTexts.filter(t => t.length > 20).length

  if (totalPages > 0 && totalChars < 500) {
    return {
      isNonSearchable: true,
      isPartiallySearchable: false,
      message: `Bu PDF'den metin çıkarılamadı (${totalChars} karakter). Taranmış/görüntü PDF olabilir. Lütfen metin tabanlı (searchable) bir PDF yükleyin veya OCR işlemi uygulayın.`
    }
  }
  
  if (totalPages > 5 && nonEmpty < totalPages * 0.3) {
    return {
      isNonSearchable: false,
      isPartiallySearchable: true,
      message: `PDF'in ${totalPages} sayfasından sadece ${nonEmpty} tanesinde metin bulundu. Bazı sayfalar taranmış görüntü olabilir.`
    }
  }

  return { isNonSearchable: false, isPartiallySearchable: false, message: null }
}

// 👁️ GÖRSEL MULTIMODAL BÖLÜMLEYİCİ: PDF'i görsel olarak inceleyip bölümleri sıfır hata ile gruplar
export async function detectSectionsMultimodal(
  fileUri: string,
  apiKey: string
): Promise<Array<{ title: string; pageStart: number; pageEnd: number }>> {
  const headers = { "Content-Type": "application/json", "x-goog-api-key": apiKey }
  const body = {
    contents: [
      {
        parts: [
          { fileData: { mimeType: "application/pdf", fileUri: fileUri } },
          {
            text: `
Ekteki PDF kitabını görsel olarak incele. 
Bu kitaptaki tüm ana bölümleri/üniteleri, başlangıç ve bitiş sayfalarını ve bölüm başlıklarını bul.

ÇOK ÖNEMLİ KURALLAR:
1. FİZİKSEL SAYFA NUMARALARI: Sayfa numaraları kitabın üzerine basılı olan sayfa numaraları KESİNLİKLE DEĞİLDİR! PDF dosyasının "fiziksel" (mutlak) sayfa sırasını (1'den başlayan absolute page index) bulmalısın. Örneğin kitabın kapağı PDF'in 1. sayfasıdır, kitabın içindeki "Sayfa 1" yazan yer PDF'in 11. sayfası olabilir. Bana kitabın üzerindeki yazan sayıyı değil, o sayfanın PDF içindeki gerçek sıra numarasını (absolute index) vermelisin.
2. EKSİKSİZLİK: "Kısaltmalar", "Tanımlar" veya "Kavramlar" gibi sınav için kritik olan başlıklar varsa, bunları da mutlaka ayrı bir bölüm olarak listeye dahil et, asla atlama.
3. TEMİZ BAŞLIK (ÇOK KRİTİK): Başlıklara ASLA "(Bölüm 3/20)" gibi bölüm numarası veya parantez içi sayaçlar EKLEME. "Ünite 1" gibi genel başlıklar kullanma, direkt konunun öz adını yaz (Örn: "Bilgi Güvenliği Yönetimi"). Parantez içi sayaç kullanırsan arayüz çöker!

Sadece aşağıdaki JSON array formatında çıktı ver (başka hiçbir şey yazma):
[
  {"title": "Bölüm Başlığı", "pageStart": 15, "pageEnd": 25}
]
`
          }
        ]
      }
    ],
    generationConfig: { temperature: 0.2 }
  }

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    body,
    { headers, timeout: 300000 }
  )
  const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]"
  try {
    // Markdown code block varsa içini al
    let cleaned = raw.trim()
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      cleaned = match[1].trim()
    }
    return JSON.parse(cleaned)
  } catch {
    const match = raw.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  }
}

// 🧠 METİN TABANLI AI YEDEĞİ: Görsel AI API kotalarına takılırsa, içindekiler tablosunu düz metinden çıkarır.
export async function detectSectionsTextAI(
  pageTexts: string[],
  apiKey: string
): Promise<Array<{ title: string; pageStart: number; pageEnd: number }>> {
  // İlk 15 sayfa (İçindekiler genelde buradadır)
  const tocText = pageTexts.slice(0, 15).map((t, i) => `--- SAYFA ${i + 1} ---\n${t}`).join("\n\n");
  
  const headers = { "Content-Type": "application/json", "x-goog-api-key": apiKey }
  const body = {
    contents: [
      {
        parts: [
          {
            text: `
Aşağıda bir kitabın ilk 15 sayfasının saf metin dökümü verilmiştir.
Bu metnin içindeki "İçindekiler" (Table of Contents) tablosunu bul ve bana ana bölümleri/üniteleri, başlangıç ve bitiş sayfalarını çıkar.

ÇOK ÖNEMLİ KURALLAR:
1. FİZİKSEL SAYFA NUMARALARI: Bana kitabın üzerine basılı olan matbaa numaralarını değil, yukarıdaki metinde gördüğün mutlak (fiziksel) sayfa numaralarını çıkaracaksın. Kapak vs gibi sayfaları hesaba katarak gerçek başlangıç sayfasını bul.
2. EKSİKSİZLİK: "Kısaltmalar", "Tanımlar" veya "Kavramlar" gibi sınav için kritik olan başlıklar varsa, bunları da mutlaka listeye dahil et.
3. TEMİZ BAŞLIK (ÇOK KRİTİK): Başlıklara ASLA "(Bölüm 3/20)" gibi sayaçlar veya "Ünite 1" gibi jenerik laflar EKLEME. Sadece konunun öz adını yaz. Parantez içi sayaç kullanırsan arayüz çöker!

Sadece aşağıdaki JSON array formatında çıktı ver (başka hiçbir şey yazma):
[
  {"title": "Bölüm Başlığı", "pageStart": 15, "pageEnd": 25}
]

KAYNAK METİN:
${tocText}
`
          }
        ]
      }
    ],
    generationConfig: { temperature: 0.1 }
  }

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    body,
    { headers, timeout: 60000 }
  )
  const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]"
  try {
    let cleaned = raw.trim()
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      cleaned = match[1].trim()
    }
    return JSON.parse(cleaned)
  } catch {
    const match = raw.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  }
}
