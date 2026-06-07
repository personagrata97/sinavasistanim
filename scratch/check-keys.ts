import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const keysStr = process.env.GEMINI_API_KEYS || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const keys = keysStr.split(',').map(k => k.trim()).filter(k => k);

const uniqueKeys = new Set(keys);
console.log(`Total keys in env: ${keys.length}`);
console.log(`Unique keys: ${uniqueKeys.size}`);
