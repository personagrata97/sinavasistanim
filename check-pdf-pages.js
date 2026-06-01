const fs = require("fs");
const path = require("path");
const PDFParser = require("pdf2json");

async function main() {
  const pdfPath = "/Users/selimkaya/.gemini/antigravity/scratch/spl-study-assistant/uploads/masak-uyum-gorevlisi-1779486075638.pdf";
  const buffer = fs.readFileSync(pdfPath);
  
  console.log("📄 PDF metin çıkarma işlemi başlatılıyor...");
  
  const pages = await new Promise((resolve) => {
    const parser = new PDFParser();
    
    parser.on("pdfParser_dataReady", (data) => {
      const pagesData = data.Pages || [];
      const texts = [];
      
      for (let i = 0; i < pagesData.length; i++) {
        const page = pagesData[i];
        const pageTexts = page.Texts || [];
        
        const textParts = [];
        let lastY = -1;
        
        for (const textItem of pageTexts) {
          const t = textItem.R?.[0]?.T || "";
          let decoded;
          try { decoded = decodeURIComponent(t); } catch { decoded = t; }
          const y = Math.round(textItem.y * 10);
          
          if (decoded.trim().length === 0) continue;
          
          if (lastY >= 0 && Math.abs(y - lastY) > 1) {
            textParts.push("\n");
          }
          
          textParts.push(decoded);
          lastY = y;
        }
        
        const fullText = textParts.join(" ")
          .replace(/ +/g, " ")
          .replace(/\n +/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        
        texts.push(fullText);
      }
      
      resolve(texts);
    });
    
    parser.on("pdfParser_dataError", (err) => {
      console.error("Hata:", err);
      resolve([]);
    });
    
    parser.parseBuffer(buffer);
  });
  
  console.log(`📄 Toplam ${pages.length} adet fiziksel sayfa çıkarıldı.`);
  
  // Her sayfanın karakter uzunluğunu ve ilk 100 karakterini yazalım
  for (let i = 0; i < pages.length; i++) {
    const text = pages[i] || "";
    if (text.length > 0) {
      console.log(`Sayfa ${(i + 1).toString().padStart(3, " ")}: ${text.length.toString().padStart(6, " ")} karakter | İlk 80 char: "${text.substring(0, 80).replace(/\n/g, " ")}"`);
    }
  }
}

main().catch(console.error);
