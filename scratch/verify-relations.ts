import { prisma } from '../src/lib/prisma'

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' },
    include: {
      sections: {
        include: { questions: true, flashcards: true },
        orderBy: { order: 'asc' }
      }
    }
  })
  
  if (!course) return;
  course.sections.forEach(s => {
    console.log(`--- SECTION: ${s.title} ---`);
    console.log(`Questions: ${s.questions.length}`);
    console.log(`Flashcards: ${s.flashcards.length}`);
    if (s.questions.length > 0) {
      console.log(`Sample Question correct field: ${s.questions[0].correct}`);
    }
  })
}
main()
