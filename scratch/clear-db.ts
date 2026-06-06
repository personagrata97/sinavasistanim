import { prisma } from '../src/lib/prisma';

async function main() {
  const course = await prisma.course.update({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' },
    data: { status: 'idle' }
  });
  await prisma.section.deleteMany({
    where: { courseId: course.id }
  });
  console.log("Database cleared and course set to idle!");
}
main().catch(console.error);
