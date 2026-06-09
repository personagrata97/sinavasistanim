import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const course = await prisma.course.findFirst({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' },
    select: {
      status: true,
      sections: {
        select: { id: true, title: true, status: true, qualityScore: true }
      }
    }
  })
  
  if (!course) {
    console.log("Course not found");
    return;
  }
  
  console.log(`Course Status: ${course.status}`);
  console.log("Sections:");
  course.sections.forEach((s, i) => {
    console.log(`${i+1}. ${s.title}: ${s.status} (Score: ${s.qualityScore})`);
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
