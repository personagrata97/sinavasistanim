import { prisma } from '../src/lib/prisma';

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: 'bd-bilgi-sistemleri-guvenligi' } });
  if (!course) {
    console.log("Course not found");
    return;
  }
  
  const sections = await prisma.section.findMany({
    where: { courseId: course.id },
    select: { id: true, title: true, processed: true, verificationScore: true, _count: { select: { questions: true, flashcards: true } } },
    orderBy: { order: 'asc' }
  });
  
  console.table(sections);
}

main().catch(console.error).finally(() => prisma.$disconnect());
