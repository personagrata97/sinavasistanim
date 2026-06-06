import { prisma } from '../src/lib/prisma';
import { readFile } from 'fs/promises';
import { extractAllText } from '../src/lib/pdf-engine';

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: 'bd-bilgi-sistemleri-guvenligi' } });
  const buf = await readFile(course.pdfPath);
  const pages = await extractAllText(buf);
  for (let i = 0; i < pages.length; i++) {
    if (pages[i] && pages[i].includes('BİLGİ GÜVENLİĞİ YÖNETİMİ')) {
       console.log(`FOUND BİLGİ GÜVENLİĞİ YÖNETİMİ ON PAGE ${i+1}`);
    }
  }
}
main().catch(console.error);
