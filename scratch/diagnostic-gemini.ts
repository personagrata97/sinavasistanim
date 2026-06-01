import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const geminiKeys = (process.env.GEMINI_API_KEYS || '').split(',').filter(k => k.trim());
if (geminiKeys.length === 0) {
  console.log("No keys found.");
  process.exit(1);
}

const key = geminiKeys[0].trim();
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key}`;

async function test() {
  console.log("Requesting URL:", url);
  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: "Hello" }] }]
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000
    });
    console.log("SUCCESS:", response.status);
    console.log(response.data);
  } catch (error: any) {
    if (error.response) {
      console.log("HTTP ERROR:", error.response.status);
      console.log("HEADERS:", error.response.headers);
      console.log("DATA:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.log("NETWORK ERROR:", error.message);
    }
  }
}

test();
