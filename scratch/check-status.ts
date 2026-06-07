import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStatus() {
  const courses = await prisma.course.findMany({
    include: {
      sections: {
        select: {
          id: true,
          title: true,
          processed: true,
          verificationScore: true,
          verificationIssues: true
        }
      }
    }
  });

  const targetCourses = courses.filter((c: any) => c.name.toLowerCase().includes("bilgi sistem"));

  if (targetCourses.length === 0) {
    console.log("Bilgi Sistemleri ile ilgili kurs bulunamadı.");
  } else {
    targetCourses.forEach((c: any) => {
      console.log(`\nKurs: ${c.name} (Slug: ${c.slug}) | Status: ${c.status}`);
      const processedCount = c.sections.filter((s: any) => s.processed).length;
      console.log(`Bölümler: ${processedCount}/${c.sections.length} tamamlandı.`);
      
      c.sections.forEach((s: any) => {
        let phase = "";
        try {
           if (s.verificationIssues) {
              const issues = JSON.parse(s.verificationIssues);
              if (issues.currentMicroPhase) phase = ` [${issues.currentMicroPhase}]`;
           }
        } catch(e) {}

        console.log(`  - ${s.processed ? '[TAMAMLANDI]' : '[BEKLİYOR]'} ${s.title} (Score: ${s.verificationScore || 'N/A'})${phase}`);
      });
    });
  }
}

checkStatus().catch(console.error).finally(() => prisma.$disconnect());
