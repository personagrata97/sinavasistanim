const fs = require('fs');
const { execSync } = require('child_process');

const content = fs.readFileSync('kisa.md', 'utf-8');
const lines = content.split('\n');

const dict = {};

for (const line of lines) {
  const match = line.match(/^\*\s+\*\*([^:]+):\*\*\s+(.+)$/);
  if (match) {
    const abbr = match[1].trim();
    const meaning = match[2].trim();
    dict[abbr] = meaning;
  }
}

const jsonStr = JSON.stringify(dict).replace(/'/g, "''"); // Escape single quotes for SQL

execSync(`sqlite3 dev.db "UPDATE Course SET glossary = '${jsonStr}' WHERE slug = 'bd-bilgi-sistemleri-guvenligi';"`);
console.log('Database updated successfully via Node + sqlite3!');
