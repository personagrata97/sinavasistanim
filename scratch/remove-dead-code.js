const fs = require('fs');
const file = '/Users/selimkaya/.gemini/antigravity/scratch/spl-study-assistant/src/app/api/courses/process/route.ts';
let lines = fs.readFileSync(file, 'utf8').split('\n');
// Remove lines 1251 to 1559 (0-indexed 1250 to 1558)
lines.splice(1251, 1559 - 1251 + 1);
fs.writeFileSync(file, lines.join('\n'));
console.log('Removed dead code.');
