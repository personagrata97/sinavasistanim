import { prisma } from '../src/lib/prisma';
import { readFile } from 'fs/promises';
import { extractAllText } from '../src/lib/pdf-engine';

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: 'bd-bilgi-sistemleri-guvenligi' } });
  const buf = await readFile(course.pdfPath);
  const pages = await extractAllText(buf);
  for (let i = 0; i < pages.length; i++) {
    const text = pages[i];
    if (text && text.includes('1. BİLGİ GÜVENLİĞİ YÖNETİMİ')) {
      console.log(`FOUND '1. BİLGİ GÜVENLİĞİ YÖNETİMİ' on physical page ${i + 1}`);
    }
  }
}
main().catch(console.error);
