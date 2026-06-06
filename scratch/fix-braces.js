const fs = require('fs');
let code = fs.readFileSync('src/app/api/courses/process/route.ts', 'utf8');

// The issue is around line 351: `} else {`
// Let's just remove the `else {` part if it's orphaned, and balance the try/catch.
// If existingSections === 0 was closed early, then the else block:
// `console.log("[PROCESS] Devam: " + existingSections + " bölüm zaten var, kaldığı yerden devam ediliyor...")`
// shouldn't be in an `else`, it can just be `if (existingSections > 0) { ... }`

code = code.replace(/} else \{\s*console\.log\(`\[PROCESS\] Devam: \$\{existingSections\} bölüm zaten var, kaldığı yerden devam ediliyor\.\.\.`\)\s*\}/, 
`
    if (existingSections > 0) {
      console.log(\`[PROCESS] Devam: \${existingSections} bölüm zaten var, kaldığı yerden devam ediliyor...\`)
    }
`);

// Now let's balance the try/catch for POST
let tryIndex = code.indexOf('export async function POST(req: NextRequest) {\n  try {');
// we just count { and } from `try {` onwards.
fs.writeFileSync('src/app/api/courses/process/route.ts', code);
