import { prisma } from '../src/lib/prisma';

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: 'bd-bilgi-sistemleri-guvenligi' } });
  if (!course) return;

  const updates = [
    { title: 'Kısaltmalar', start: 7, end: 10 },
    { title: 'Bilgi Güvenliği Yönetimi', start: 11, end: 12 },
    { title: 'Varlık Yönetimi', start: 13, end: 21 },
    { title: 'Fiziksel ve Çevresel Güvenlik', start: 22, end: 29 },
    { title: 'Ağ Güvenliği', start: 30, end: 76 },
    { title: 'Erişim Güvenliği', start: 77, end: 84 },
    { title: 'Veri ve İz Kayıtlarının Güvenliği', start: 85, end: 96 },
    { title: 'Üçüncü Taraflarla İletişim Güvenliği', start: 97, end: 102 }
  ];

  for (const update of updates) {
    const sections = await prisma.section.findMany({
      where: { courseId: course.id, title: { contains: update.title } }
    });
    if (sections.length > 0) {
      await prisma.section.update({
        where: { id: sections[0].id },
        data: { pageStart: update.start, pageEnd: update.end }
      });
      console.log(`Updated ${update.title} to ${update.start}-${update.end}`);
    } else {
      console.log(`Could not find ${update.title}`);
    }
  }
}

main().catch(console.error);
