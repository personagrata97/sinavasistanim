import { readFile } from 'fs/promises';
import { extractAllText } from '../src/lib/pdf-engine';

async function main() {
  const buf = await readFile('./public/pdfs/bilgi_sistemleri_guvenligi.pdf');
  const pages = await extractAllText(buf);
  for (let i = 0; i < 15; i++) {
    const text = pages[i];
    if (text.toLowerCase().includes('içindekiler')) {
      console.log(`--- SAYFA ${i+1} ---`);
      console.log(text);
    }
  }
}
main().catch(console.error);
