const fs = require("fs");
const PDFParser = require("pdf2json");

const pdfPath = "/Users/selimkaya/.gemini/antigravity/scratch/spl-study-assistant/uploads/masak-uyum-gorevlisi-1779486075638.pdf";
const buffer = fs.readFileSync(pdfPath);
const parser = new PDFParser();

parser.on("pdfParser_dataReady", (data) => {
  for (let i = 70; i < data.Pages.length; i++) {
    const page = data.Pages[i];
    const texts = page.Texts || [];
    // Find numbers near the bottom (y > 48)
    const pageNumText = texts.find(t => {
      const txt = decodeURIComponent(t.R?.[0]?.T || "").trim();
      return /^\d+$/.test(txt) && t.y > 48;
    });
    const num = pageNumText ? decodeURIComponent(pageNumText.R[0].T).trim() : "None";
    console.log(`Physical Page ${i + 1}: Printed Page Number at bottom = ${num}`);
  }
  process.exit(0);
});

parser.on("pdfParser_dataError", (err) => {
  console.error("Error:", err);
  process.exit(1);
});

parser.parseBuffer(buffer);
