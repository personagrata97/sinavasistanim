import { prisma } from '../src/lib/prisma'

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' },
    include: { sections: true }
  })
  
  if (!course) return;
  course.sections.forEach(s => {
    console.log(`- ${s.title}: ${s.rawContent.length} chars. Processed: ${s.processed}`);
  })
}
main()
