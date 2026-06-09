import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const course = await prisma.course.findFirst({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' },
    select: {
      status: true,
      processedPages: true,
      totalPages: true,
      sections: {
        select: { id: true, title: true, processed: true, verificationScore: true }
      }
    }
  })
  
  if (!course) {
    console.log("Course not found");
    return;
  }
  
  console.log(`Course Status: ${course.status}`);
  console.log(`Progress: ${course.processedPages} / ${course.totalPages}`);
  console.log("Sections:");
  course.sections.forEach((s, i) => {
    console.log(`${i+1}. ${s.title}: Processed=${s.processed} (Score: ${s.verificationScore})`);
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
