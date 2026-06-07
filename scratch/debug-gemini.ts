import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config();

const keysStr = process.env.GEMINI_API_KEYS || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const keys = keysStr.split(',').filter(k => k.trim());

async function testKey(key: string, index: number) {
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent("Merhaba, sadece 'OK' yaz.");
    console.log(`Key #${index + 1} SUCCESS:`, result.response.text().trim());
  } catch (error: any) {
    console.log(`Key #${index + 1} ERROR:`, error.message);
  }
}

async function main() {
  for (let i = 0; i < Math.min(keys.length, 3); i++) {
    await testKey(keys[i].trim(), i);
  }
}

main();
