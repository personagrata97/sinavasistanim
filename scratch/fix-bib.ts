import { readFileSync } from 'fs'
import { extractAllText } from '../src/lib/pdf-engine'
import { prisma } from '../src/lib/prisma'

async function findBib() {
  const courseSlug = 'bd-bilgi-sistemleri-guvenligi'
  const course = await prisma.course.findUnique({ where: { slug: courseSlug } })
  const buffer = readFileSync(course!.pdfPath)
  const text = await extractAllText(buffer)
  
  for (let i = text.length - 10; i < text.length; i++) {
    const pageText = text[i]?.content || ''
    console.log(`Page ${i + 1}: ${pageText.substring(0, 100).replace(/\\n/g, ' ')}`)
  }
  
  console.log("Bibliography starts at physical page:", bibPage)

  if (bibPage !== -1) {
     const section = await prisma.section.findFirst({
        where: { courseId: course!.id, title: 'ÜÇÜNCÜ TARAFLARLA İLETİŞİM GÜVENLİĞİ' }
     })
     if (section) {
        await prisma.section.update({
           where: { id: section.id },
           data: { pageEnd: bibPage - 1 }
        })
        console.log(`Updated end page to ${bibPage - 1}`)
     }
  }
}
findBib().catch(console.error).finally(() => prisma.$disconnect())
