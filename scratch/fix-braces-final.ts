import * as fs from 'fs';
const { execSync } = require('child_process');

let code = fs.readFileSync('src/app/api/courses/process/route.ts', 'utf8');

// There's an extra `}` or missing `}` inside POST.
// Since POST starts at `try {` and ends at `} catch (error: any) { ... }`,
// Let's systematically remove the last `}` before catch until it compiles!

const catchStr = '} catch (error: any) {';

for (let i = 0; i < 5; i++) {
    try {
        execSync('npx tsc src/app/api/courses/process/route.ts --noEmit', { stdio: 'ignore' });
        console.log("COMPILED PERFECTLY!");
        break;
    } catch(e) {
        let code = fs.readFileSync('src/app/api/courses/process/route.ts', 'utf8');
        let catchIndex = code.indexOf(catchStr);
        if (catchIndex === -1) {
            console.log("CATCH NOT FOUND!");
            break;
        }
        let beforeCatch = code.substring(0, catchIndex);
        let lastBrace = beforeCatch.lastIndexOf('}');
        if (lastBrace === -1) break;
        
        let newCode = beforeCatch.substring(0, lastBrace) + beforeCatch.substring(lastBrace + 1) + code.substring(catchIndex);
        fs.writeFileSync('src/app/api/courses/process/route.ts', newCode);
        console.log("Removed one brace, retrying...");
    }
}
