const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = '/Users/selimkaya/.gemini/antigravity/scratch/spl-study-assistant/public/pdfs/bd-bilgi-sistemleri-guvenligi.pdf';
// actually let's find the exact path
const dir = '/Users/selimkaya/.gemini/antigravity/scratch/spl-study-assistant/public/pdfs';
const files = fs.readdirSync(dir);
const file = files.find(f => f.includes('bilgi'));

if (file) {
  const dataBuffer = fs.readFileSync(dir + '/' + file);
  pdf(dataBuffer).then(function(data) {
    const text = data.text;
    const lines = text.split('\n');
    let tocLines = [];
    let capturing = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes('içindekiler') || line.toLowerCase().includes('kısaltmalar')) {
        capturing = true;
      }
      if (capturing && i < 150) { // search first 150 lines
        tocLines.push(line);
      }
    }
    console.log(tocLines.slice(0, 50).join('\n'));
  });
} else {
  console.log("PDF not found in " + dir);
}
