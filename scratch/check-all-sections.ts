import { prisma } from '../src/lib/prisma'

async function main() {
  const allProcessed = await prisma.section.count({
    where: { processed: true }
  })
  
  const allCourses = await prisma.course.findMany({
    select: { slug: true, status: true, _count: { select: { sections: { where: { processed: true } } } } }
  })
  
  console.log(`TOTAL PROCESSED SECTIONS: ${allProcessed}`);
  allCourses.forEach(c => {
    if (c._count.sections > 0) {
      console.log(`- ${c.slug}: ${c._count.sections} sections processed`);
    }
  })
}
main()
