import axios from "axios";
import { config } from "dotenv";
config();

const geminiKeys = (process.env.GEMINI_API_KEYS || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").split(",").filter(k => k.trim());
const firstKey = geminiKeys[0]?.trim();

if (!firstKey) {
  console.log("No API keys found in .env");
  process.exit(1);
}

const modelsToTest = [
  "gemini-1.5-pro",
  "gemini-1.5-pro-latest",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b",
  "gemini-1.5-flash-8b-latest",
  "gemini-1.0-pro",
  "gemini-1.0-pro-latest",
  "gemini-pro",
  "gemini-pro-vision",
  "gemini-ultra",
  "gemini-advanced",
  "gemini-2.0-pro",
  "gemini-2.0-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-3.0-pro",
  "gemini-3.0-flash",
  "gemini-3.5-pro",
  "gemini-3.5-flash"
];

async function testModels() {
  console.log(`Testing models using 1 of the ${geminiKeys.length} provided keys...\n`);
  
  for (const model of modelsToTest) {
    try {
      const startTime = Date.now();
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          contents: [{ parts: [{ text: "Hello" }] }]
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": firstKey
          },
          timeout: 10000
        }
      );
      
      const ms = Date.now() - startTime;
      console.log(`✅ [${model}] -> ÇALIŞIYOR (Yanıt süresi: ${ms}ms)`);
    } catch (error: any) {
      if (error.response) {
        if (error.response.status === 404) {
          console.log(`❌ [${model}] -> DESTEKLENMİYOR (Model bulunamadı - 404)`);
        } else if (error.response.status === 403) {
          console.log(`🚫 [${model}] -> YETKİ YOK (Bu key'in modele erişimi yok - 403)`);
        } else if (error.response.status === 429) {
          console.log(`⚠️ [${model}] -> KOTA DOLU (Model destekleniyor ama limit dolu - 429)`);
        } else {
          console.log(`❌ [${model}] -> HATA (${error.response.status}: ${error.message})`);
        }
      } else {
        console.log(`❌ [${model}] -> BAĞLANTI HATASI VEYA TIMEOUT`);
      }
    }
  }
}

testModels();
