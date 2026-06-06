import * as ts from 'typescript';
import * as fs from 'fs';

const filePath = 'src/app/api/courses/process/route.ts';
let code = fs.readFileSync(filePath, 'utf8');

// The file has a try block that is closed too early. We need to find the `try {` in POST
// and ensure it reaches all the way to `} catch (error: any) {` before being closed.
// The easiest way is to find the extra `}` and remove it.
// If there's an extra `}`, we can count depth and just remove the very last `}` before the `catch` block that brings depth to 0 too early.

let tryIndex = code.indexOf('export async function POST');
let catchIndex = code.indexOf('} catch (error: any) {');

let beforeCatch = code.substring(0, catchIndex);
let lastBraceBeforeCatch = beforeCatch.lastIndexOf('}');
code = beforeCatch.substring(0, lastBraceBeforeCatch) + beforeCatch.substring(lastBraceBeforeCatch + 1) + code.substring(catchIndex);

fs.writeFileSync(filePath, code);
