import { prisma } from '../src/lib/prisma'

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: 'bd-bilgi-sistemleri-isletimi' },
    include: {
      sections: {
        select: { id: true, title: true, processed: true, verificationScore: true }
      }
    }
  })
  
  if (!course) {
    console.log("Course not found.")
    return
  }
  
  console.log(`Course Status: ${course.status}`)
  console.log(`Progress: ${course.progress}%`)
  const processedCount = course.sections.filter((s: any) => s.processed).length
  console.log(`Sections Processed: ${processedCount} / ${course.sections.length}`)
  
  console.log("\nSection Details:")
  for (const s of course.sections) {
    console.log(`- ${s.title.substring(0, 40)}... | Processed: ${s.processed} | Score: ${s.verificationScore}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
