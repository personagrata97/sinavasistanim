import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const course = await prisma.course.findFirst({
    where: { name: { contains: 'Bilgi' } },
    include: { sections: true }
  })
  if (!course) {
    console.log('Course not found')
    return
  }
  console.log('Course:', course.name)
  console.log('Total sections:', course.sections.length)
  console.log('Processed sections:', course.sections.filter(s => s.processed).length)
  
  course.sections.forEach(s => {
    console.log(`- Sec ${s.order}: ${s.title} | Processed: ${s.processed} | Score: ${s.verificationScore}`)
  })
}
main().catch(console.error).finally(() => prisma.$disconnect())
