import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const geminiKeys = (process.env.GEMINI_API_KEYS || '').split(',').filter(k => k.trim());
const key = geminiKeys[0].trim();

async function run() {
  const headers = { "Content-Type": "application/json", "x-goog-api-key": key };
  const body = {
    contents: [{ parts: [{ text: "Write a 3-word greeting." }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 20 }
  };
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
      body,
      { headers, timeout: 10000 }
    );
    console.log("Response Status:", response.status);
    console.log("Raw Response Data:", JSON.stringify(response.data, null, 2));
  } catch (e: any) {
    console.error("Error status:", e.response?.status);
    console.error("Error data:", JSON.stringify(e.response?.data, null, 2));
  }
}

run().catch(console.error);
