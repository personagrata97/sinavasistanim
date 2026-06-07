import { prisma } from '../src/lib/prisma'

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' },
    include: {
      sections: {
        select: { id: true, title: true, processed: true, updatedAt: true }
      }
    }
  })
  
  if (!course) return;
  console.log(`Course updatedAt: ${course.updatedAt}`);
  course.sections.filter(s => s.processed).forEach(s => {
    console.log(`PROCESSED: ${s.title} -> ${s.updatedAt}`);
  })
}
main()
