import { prisma } from '../src/lib/prisma';
import { readFile } from 'fs/promises';
import { extractAllText } from '../src/lib/pdf-engine';

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: 'bd-bilgi-sistemleri-guvenligi' } });
  const buf = await readFile(course.pdfPath);
  const pages = await extractAllText(buf);
  console.log("--- SAYFA 26 ---");
  console.log(pages[25].split('\n').slice(0, 10).join('\n'));
  console.log("--- SAYFA 28 ---");
  console.log(pages[27].split('\n').slice(0, 10).join('\n'));
}
main().catch(console.error);
