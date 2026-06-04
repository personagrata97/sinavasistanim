import { prisma } from '../src/lib/prisma';

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: 'bd-bilgi-sistemleri-isletimi' } });
  if (!course) return console.log("Course not found");
  
  const sections = await prisma.section.findMany({ where: { courseId: course.id }, orderBy: { order: 'asc' } });
  if (sections.length === 0) return console.log("No sections found");
  
  const sec1 = sections[0]; // Bölüm 1
  console.log("Resetting Section:", sec1.title);
  
  await prisma.section.update({
    where: { id: sec1.id },
    data: { 
      processed: false, 
      notes: null, 
      verificationScore: null,
      verificationIssues: null
    }
  });
  console.log("SUCCESS: Bölüm 1 fully reset!");
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
