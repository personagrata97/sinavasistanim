import { prisma } from '../src/lib/prisma';

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: 'bd-bilgi-sistemleri-guvenligi' } });
  if (!course) return;

  // Physical Page = Printed Page + 10
  const updates = [
    { title: 'Kısaltmalar', start: 7, end: 26 }, // up to 17
    { title: 'Bilgi Güvenliği Yönetimi', start: 27, end: 28 }, // 17-18
    { title: 'Varlık Yönetimi', start: 29, end: 37 }, // 19-27
    { title: 'Fiziksel ve Çevresel Güvenlik', start: 38, end: 45 }, // 28-35
    { title: 'Ağ Güvenliği', start: 46, end: 92 }, // 36-82
    { title: 'Erişim Güvenliği', start: 93, end: 100 }, // 83-90
    { title: 'Veri ve İz Kayıtlarının Güvenliği', start: 101, end: 112 }, // 91-102
    { title: 'Üçüncü Taraflarla İletişim Güvenliği', start: 113, end: 118 } // 103-108
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
