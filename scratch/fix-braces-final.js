const fs = require('fs');
const { execSync } = require('child_process');

let code = fs.readFileSync('src/app/api/courses/process/route.ts', 'utf8');
const catchStr = '} catch (error: any) {';

for (let i = 0; i < 5; i++) {
    try {
        execSync('npx tsc src/app/api/courses/process/route.ts --noEmit', { stdio: 'ignore' });
        console.log("COMPILED PERFECTLY!");
        break;
    } catch(e) {
        let currentCode = fs.readFileSync('src/app/api/courses/process/route.ts', 'utf8');
        let catchIndex = currentCode.indexOf(catchStr);
        let beforeCatch = currentCode.substring(0, catchIndex);
        let lastBrace = beforeCatch.lastIndexOf('}');
        let newCode = beforeCatch.substring(0, lastBrace) + beforeCatch.substring(lastBrace + 1) + currentCode.substring(catchIndex);
        fs.writeFileSync('src/app/api/courses/process/route.ts', newCode);
    }
}
