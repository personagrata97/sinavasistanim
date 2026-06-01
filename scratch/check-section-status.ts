import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const course = await prisma.course.findFirst({
    where: { name: { contains: "Bilgi Güvenliği" } },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          processed: true,
          verificationScore: true,
          order: true
        }
      }
    }
  });

  if (!course) {
    console.log("Course not found.");
    return;
  }

  console.log(`Course: ${course.name} (Status: ${course.status})`);
  console.log("Sections:");
  course.sections.forEach(s => {
    console.log(`- [${s.order}] ${s.title}: Processed=${s.processed}, Score=${s.verificationScore}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
