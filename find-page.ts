import { readFileSync } from "fs";
import { extractAllText } from "./src/lib/pdf-engine.ts";

async function main() {
  const buf = readFileSync("./uploads/bd-bilgi-sistemleri-guvenligi-1780681178970.pdf");
  const texts = await extractAllText(buf);
  for (let i = 0; i < texts.length; i++) {
    if (texts[i].includes("ÜÇÜNCÜ TARAFLARLA İLETİŞİM GÜVENLİĞİ") || texts[i].includes("Üçüncü Taraflarla")) {
      console.log(`Fiziksel Sayfa ${i + 1}: Bulundu!`);
    }
  }
}
main().catch(console.error);
