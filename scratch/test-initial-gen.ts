import * as dotenv from "dotenv"
dotenv.config()
import { prisma } from "../src/lib/prisma"
import axios from "axios"

async function callGemini(prompt: string): Promise<string> {
  const keys = (process.env.GEMINI_API_KEYS || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").split(",").filter(k => k.trim())
  if (keys.length === 0) throw new Error("No keys found")
  
  for (const apiKey of keys) {
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
      return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
    } catch (err: any) {
      console.warn("Key failed, trying next...")
    }
  }
  throw new Error("All keys failed")
}

async function run() {
  const section = await prisma.section.findFirst({
    where: { order: 2, course: { slug: "bd-bilgi-sistemleri-guvenligi" } }
  })
  if (!section) return
  
  console.log("Generating test notes...")
  const prompt = `Sana Sermaye Piyasası resmi kaynağı olan aşağıdaki metni veriyorum.
Bu metinden sıfırdan, son derece dolgun, ayrıntılı ve premium düzeyde bir "Ders Notu" hazırlamanı istiyorum.

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

Şimdi sadece ders notunu döndür. Başka hiçbir açıklama yazma.
[RAW SOURCE CONTENT]
${section.rawContent}`

  const notes = await callGemini(prompt)
  console.log("\n=== RETURNED NOTES (Length:", notes.length, "characters) ===")
  console.log(notes.substring(0, 1500))
  console.log("...")
  console.log(notes.substring(notes.length - 1500))
}

run().catch(console.error).finally(() => prisma.$disconnect())
