import { prisma } from '../src/lib/prisma'
import { extractAllText } from '../src/lib/pdf-engine'
import { readFileSync } from 'fs'

async function main() {
  const courseSlug = 'bd-bilgi-sistemleri-guvenligi'
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    include: { sections: { orderBy: { pageStart: 'asc' } } }
  })

  if (!course) return console.error("Course not found")

  console.log(`Processing ${course.name}...`)
  
  const buffer = readFileSync(course.pdfPath)
  const pageTexts = await extractAllText(buffer)
  
  console.log(`Extracted ${pageTexts.length} pages of text`)

  const OFFSET = 6;
  console.log(`Adding offset +${OFFSET} to all sections...`)

  for (let i = 0; i < course.sections.length; i++) {
    const section = course.sections[i]
    
    // Yalnızca offset eklenmemişse ekle (örneğin ilk bölüm 7 ise muhtemelen eklenmemiştir)
    if (section.pageStart < 20 && section.title === "KISALTMALAR" && section.pageStart === 7) {
       // Offset uygulanmalı
    }
    
    // Add offset safely
    const newStart = section.pageStart + OFFSET
    let newEnd = section.pageEnd + OFFSET
    if (newEnd > pageTexts.length) newEnd = pageTexts.length;
    
    console.log(`Updating "${section.title}": ${section.pageStart}->${newStart}, ${section.pageEnd}->${newEnd}`)
    
    await prisma.section.update({
      where: { id: section.id },
      data: { 
        pageStart: newStart,
        pageEnd: newEnd
      }
    })
  }

  console.log("Done fixing pages with offset!")

  console.log("Done fixing pages!")
}

main().catch(console.error).finally(() => prisma.$disconnect())
