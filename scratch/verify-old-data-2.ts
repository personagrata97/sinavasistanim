import { prisma } from '../src/lib/prisma'

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' },
    include: { sections: { orderBy: { order: 'asc' } } }
  })
  
  if (!course) return;
  
  for(let i=0; i<=3; i++) {
    const s = course.sections[i];
    console.log(`--- SECTION: ${s.title} ---`);
    console.log(`Flashcards length: ${s.generatedFlashcards?.length || 0}`);
    console.log(`Questions length: ${s.generatedQuestions?.length || 0}`);
  }
}
main()
