import { readFileSync } from "fs";
import { extractAllText } from "./src/lib/pdf-engine.ts";

async function main() {
  const buf = readFileSync("./uploads/bd-bilgi-sistemleri-guvenligi-1780681178970.pdf");
  const texts = await extractAllText(buf);
  console.log("SAYFA 108:\n", texts[107].slice(0, 300));
  console.log("SAYFA 109:\n", texts[108].slice(0, 300));
  console.log("SAYFA 110:\n", texts[109].slice(0, 300));
  console.log("SAYFA 111:\n", texts[110].slice(0, 300));
  console.log("SAYFA 115:\n", texts[114].slice(0, 300));
  console.log("SAYFA 120:\n", texts[119].slice(0, 300));
}
main().catch(console.error);
