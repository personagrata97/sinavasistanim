const fs = require('fs');

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

const fileContent = `// Otomatik olarak "KISALTMALAR" bölümünden üretildi
export const ABBREVIATIONS_DICT: Record<string, string> = ${JSON.stringify(dict, null, 2)};
`;

fs.writeFileSync('src/lib/abbreviations.ts', fileContent);
console.log('Dictionary generated!');
