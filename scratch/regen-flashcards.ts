import { prisma } from '../src/lib/prisma.ts';
import { generateFlashcards } from '../src/lib/ai-service.ts';

async function run() {
  const course = await prisma.course.findUnique({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' },
    include: { sections: { orderBy: { order: 'asc' } } }
  });
  
  if (!course) {
    console.error("Course not found");
    return;
  }
  
  const sec1 = course.sections[0]; // Bölüm 1
  if (!sec1) {
    console.error("Section 1 not found");
    return;
  }
  
  console.log(`[REGEN] Deleting old flashcards for section: ${sec1.title}...`);
  await prisma.flashcard.deleteMany({
    where: { sectionId: sec1.id }
  });
  
  console.log(`[REGEN] Generating new flashcards using latest AI prompts...`);
  const fullContent = `${sec1.rawContent}\n\n--- DERS NOTLARI ---\n${sec1.notes}`;
  
  const flashcards = await generateFlashcards(
    fullContent, 
    sec1.title, 
    course.name, 
    course.userLevel, 
    course.aiMode, 
    undefined, 
    sec1.pageStart, 
    sec1.pageEnd
  );
  
  console.log(`[REGEN] Generated ${flashcards.length} flashcards. Saving to DB...`);
  for (const f of flashcards) {
    await prisma.flashcard.create({
      data: {
        front: f.front,
        back: f.back,
        courseId: course.id,
        sectionId: sec1.id
      }
    });
  }
  
  console.log('[REGEN] Done!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
