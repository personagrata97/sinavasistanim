import { prisma } from '../src/lib/prisma';

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: 'bd-bilgi-sistemleri-guvenligi' } });
  if (!course) return;

  const count = await prisma.section.count({ where: { courseId: course.id } });
  if (count > 0) {
    console.log("Sections already exist! Deleting them to insert the perfect ones.");
    await prisma.section.deleteMany({ where: { courseId: course.id } });
  }

  const sections = [
    { title: 'Kısaltmalar', pageStart: 7, pageEnd: 26, order: 1 },
    { title: 'Bilgi Güvenliği Yönetimi', pageStart: 27, pageEnd: 28, order: 2 },
    { title: 'Varlık Yönetimi', pageStart: 29, pageEnd: 37, order: 3 },
    { title: 'Fiziksel ve Çevresel Güvenlik', pageStart: 38, pageEnd: 45, order: 4 },
    { title: 'Ağ Güvenliği', pageStart: 46, pageEnd: 92, order: 5 },
    { title: 'Erişim Güvenliği', pageStart: 93, pageEnd: 100, order: 6 },
    { title: 'Veri ve İz Kayıtlarının Güvenliği', pageStart: 101, pageEnd: 112, order: 7 },
    { title: 'Üçüncü Taraflarla İletişim Güvenliği', pageStart: 113, pageEnd: 118, order: 8 }
  ];

  for (const s of sections) {
    await prisma.section.create({
      data: {
        courseId: course.id,
        title: s.title,
        pageStart: s.pageStart,
        pageEnd: s.pageEnd,
        order: s.order,
        status: 'pending'
      }
    });
    console.log(`Inserted ${s.title} (${s.pageStart}-${s.pageEnd})`);
  }
}

main().catch(console.error);
