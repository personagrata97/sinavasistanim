import { prisma } from '../src/lib/prisma';
import { readFile } from 'fs/promises';
import { extractAllText } from '../src/lib/pdf-engine';

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: 'bd-bilgi-sistemleri-guvenligi' } });
  const buf = await readFile(course.pdfPath);
  const pages = await extractAllText(buf);
  for (let i = 0; i < 7; i++) {
    console.log(`--- SAYFA ${i+1} ---`);
    console.log(pages[i]);
  }
}
main().catch(console.error);
