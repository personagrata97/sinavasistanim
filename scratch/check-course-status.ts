import { prisma } from '../src/lib/prisma';
async function main() {
  const course = await prisma.course.findUnique({ where: { slug: 'bd-bilgi-sistemleri-guvenligi' } });
  console.log("Course Status:", course?.status);
}
main().catch(console.error).finally(() => prisma.$disconnect());
