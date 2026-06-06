const fs = require('fs');
const { execSync } = require('child_process');

let raw = fs.readFileSync('scratch/kisaltmalar_raw.md', 'utf8');

// Ayırıcı: ### 🔑
let parts = raw.split(/### 🔑\s*/);
let header = parts[0].trim();

let tableHtml = `| Kısaltma / Terim | Açıklama |\n| :--- | :--- |\n`;

for (let i = 1; i < parts.length; i++) {
  let block = parts[i].trim();
  if (!block) continue;
  if (block === '---') continue; // separator
  
  let lines = block.split('\n').map(l => l.trim()).filter(l => l && l !== '---');
  let title = lines[0];
  let descLines = [];
  for (let j = 1; j < lines.length; j++) {
    let l = lines[j];
    if (l.startsWith('- ')) {
       // Kalınlaştırmaları falan koru
       descLines.push(l.substring(2));
    }
  }
  
  let desc = descLines.join('<br>');
  tableHtml += `| **${title}** | ${desc} |\n`;
}

let finalMd = `${header}\n\n${tableHtml}`;
fs.writeFileSync('scratch/kisaltmalar_table.md', finalMd);

// Update DB
let escapedFinalMd = finalMd.replace(/'/g, "''");
let updateCmd = `sqlite3 dev.db "UPDATE Section SET notes = '${escapedFinalMd}' WHERE title = 'Kısaltmalar';"`;
execSync(updateCmd);
console.log("DB updated successfully with Table format!");
