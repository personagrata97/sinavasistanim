const fs = require("fs");
const PDFParser = require("pdf2json");

const pdfPath = "/Users/selimkaya/.gemini/antigravity/scratch/spl-study-assistant/uploads/masak-uyum-gorevlisi-1779486075638.pdf";
const buffer = fs.readFileSync(pdfPath);
const parser = new PDFParser();

parser.on("pdfParser_dataReady", (data) => {
  const page = data.Pages[80]; // index 80 is page 81
  console.log("Page 81 raw structure:", JSON.stringify(page, null, 2));
  process.exit(0);
});

parser.on("pdfParser_dataError", (err) => {
  console.error("Error:", err);
  process.exit(1);
});

parser.parseBuffer(buffer);
