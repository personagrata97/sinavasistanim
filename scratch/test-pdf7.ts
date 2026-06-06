import { prisma } from '../src/lib/prisma';
import { readFile } from 'fs/promises';
import { extractAllText } from '../src/lib/pdf-engine';

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: 'bd-bilgi-sistemleri-guvenligi' } });
  const buf = await readFile(course.pdfPath);
  const pages = await extractAllText(buf);
  for (let i = 20; i < 35; i++) {
    if (pages[i] && pages[i].toLowerCase().includes('bilgi')) {
       console.log(`--- SAYFA ${i+1} ---`);
       console.log(pages[i].split('\n').slice(0, 5).join('\n'));
    }
  }
}
main().catch(console.error);
