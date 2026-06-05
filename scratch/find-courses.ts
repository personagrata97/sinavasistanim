import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const courses = await prisma.course.findMany({
    orderBy: { order: 'asc' }
  })
  
  console.log("Mevcut Dersler:")
  for (const c of courses) {
    console.log(`- ${c.name} (Slug: ${c.slug}, ID: ${c.id})`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
