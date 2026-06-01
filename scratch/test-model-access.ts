import "dotenv/config"
import axios from "axios"

async function testModel(modelId: string, apiKey: string, keyIndex: number) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`,
      {
        contents: [{ parts: [{ text: "Merhaba, sadece 'OK' yaz." }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 50 }
      },
      {
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        timeout: 30000
      }
    )
    const parts = response.data?.candidates?.[0]?.content?.parts || []
    const text = parts.filter((p: any) => p.text && !p.thought).map((p: any) => p.text).join("")
    console.log(`  ✅ Key #${keyIndex + 1} → ${modelId}: BAŞARILI (${text.substring(0, 50)})`)
    return true
  } catch (e: any) {
    const errMsg = e.response?.data?.error?.message || e.message || "bilinmeyen hata"
    console.log(`  ❌ Key #${keyIndex + 1} → ${modelId}: BAŞARISIZ (${errMsg.substring(0, 100)})`)
    return false
  }
}

async function main() {
  const keys = (process.env.GEMINI_API_KEYS || "").split(",").filter(k => k.trim())
  console.log(`\n🔑 Toplam ${keys.length} API key bulundu.\n`)

  const modelsToTest = [
    "gemini-3.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-1.5-pro",
  ]

  // İlk 2 key ile test yap (hepsini test etmek gereksiz — aynı Google hesabına bağlı)
  const keysToTest = keys.slice(0, 2)

  for (const model of modelsToTest) {
    console.log(`\n📡 Model: ${model}`)
    for (let i = 0; i < keysToTest.length; i++) {
      await testModel(model, keysToTest[i].trim(), i)
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  console.log("\n✨ Test tamamlandı!")
}

main().catch(console.error)
