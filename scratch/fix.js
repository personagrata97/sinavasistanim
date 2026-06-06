const fs = require('fs');
let code = fs.readFileSync('src/app/api/courses/process/route.ts', 'utf8');
let lines = code.split('\n');

// The file has a broken try-catch structure because of missing braces.
// We know `POST` starts with `try {` and ends with `} catch { ... }`
// We also know `existingSections === 0` starts at line 86.
// Let's just forcefully fix the braces.

let newLines = [];
for(let i=0; i<lines.length; i++) {
  newLines.push(lines[i]);
}

// Write it
fs.writeFileSync('scratch/route_fixed.ts', newLines.join('\n'));
