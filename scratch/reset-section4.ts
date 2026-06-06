import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function resetSection4() {
  const section = await prisma.section.findFirst({
    where: { title: { contains: "Fiziksel ve Çevresel Güvenlik" } }
  });

  if (!section) {
    console.log("Section not found");
    return;
  }

  console.log("Found section:", section.id);

  // Flashcards sil
  const delF = await prisma.flashcard.deleteMany({
    where: { sectionId: section.id }
  });
  console.log("Deleted flashcards:", delF.count);

  // Soruları sil
  const delQ = await prisma.question.deleteMany({
    where: { sectionId: section.id }
  });
  console.log("Deleted questions:", delQ.count);

  // Section sıfırla
  await prisma.section.update({
    where: { id: section.id },
    data: {
      processed: false,
      notes: null,
      verificationScore: 0,
      verificationIssues: null,
      summary: null,
      topics: null
    }
  });
  console.log("Section 4 sıfırlandı!");
}

resetSection4().catch(console.error).finally(() => prisma.$disconnect());
