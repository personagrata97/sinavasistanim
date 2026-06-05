import { readFileSync } from "fs";
import { extractAllText } from "./src/lib/pdf-engine.ts";

async function main() {
  const buf = readFileSync("./uploads/bd-bilgi-sistemleri-guvenligi-1780681178970.pdf");
  const texts = await extractAllText(buf);
  console.log(texts.slice(0, 10).join("\n\n---\n\n"));
}
main().catch(console.error);
