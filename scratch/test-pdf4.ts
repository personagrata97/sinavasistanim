import { prisma } from '../src/lib/prisma';
import { readFile } from 'fs/promises';
import { extractAllText } from '../src/lib/pdf-engine';

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: 'bd-bilgi-sistemleri-guvenligi' } });
  const buf = await readFile(course.pdfPath);
  const pages = await extractAllText(buf);
  for (let i = 101; i < pages.length; i++) {
    const text = pages[i];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    console.log(`--- SAYFA ${i+1} ---`);
    console.log(lines.slice(0, 3).join('\n'));
  }
}
main().catch(console.error);
