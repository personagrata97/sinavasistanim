import { prisma } from '../src/lib/prisma'

async function main() {
  const zombies = await prisma.course.findMany({
    where: { status: 'processing' },
    select: { id: true, name: true, updatedAt: true }
  })
  console.log('ZOMBIE COURSES:', JSON.stringify(zombies, null, 2))
  
  const zombieSections = await prisma.section.findMany({
    where: { processed: false },
    select: { id: true, title: true, courseId: true }
  })
  console.log('UNPROCESSED SECTIONS:', zombieSections.length)
}
main()
