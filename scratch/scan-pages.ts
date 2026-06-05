import { readFileSync } from 'fs'
import { extractAllText } from '../src/lib/pdf-engine'
import { prisma } from '../src/lib/prisma'

async function main() {
  const courseSlug = 'bd-bilgi-sistemleri-guvenligi'
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    include: { sections: { orderBy: { pageStart: 'asc' } } }
  })

  if (!course) return console.error("Course not found")

  const buffer = readFileSync(course.pdfPath)
  const pageTexts: string[] = await extractAllText(buffer)

  console.log(`Total pages: ${pageTexts.length}`)
  
  // İçindekiler tablosu sayfalarını atla (ilk 10 sayfa genelde TOC)
  // Başlığı sayfanın İLK 5 SATIRINDA ara (sadece bölüm başlangıç sayfasında başlık üstte olur)
  const tocPages = new Set<number>() // TOC sayfalarını tespit et
  
  // Önce TOC sayfalarını bul (içinde 3+ bölüm başlığı geçen sayfalar)
  for (let p = 0; p < Math.min(15, pageTexts.length); p++) {
    const text = pageTexts[p].toLowerCase()
    let matchCount = 0
    for (const section of course.sections) {
      if (text.includes(section.title.toLowerCase())) matchCount++
    }
    if (matchCount >= 3) {
      tocPages.add(p)
      console.log(`TOC sayfası tespit edildi: ${p + 1} (${matchCount} başlık eşleşti)`)
    }
  }

  // Şimdi her bölüm için gerçek sayfayı bul
  const updates: { id: string; title: string; newStart: number }[] = []
  
  for (const section of course.sections) {
    let truePage = -1
    const titleLower = section.title.toLowerCase()
    
    for (let p = 0; p < pageTexts.length; p++) {
      if (tocPages.has(p)) continue // TOC sayfalarını atla
      
      const pageText = pageTexts[p]
      const firstLines = pageText.split('\n').slice(0, 8).join('\n').toLowerCase()
      
      if (firstLines.includes(titleLower)) {
        truePage = p + 1
        break
      }
    }
    
    // Fallback: ilk 8 satırda bulamadıysa tüm sayfayı tara (TOC hariç)
    if (truePage === -1) {
      for (let p = 0; p < pageTexts.length; p++) {
        if (tocPages.has(p)) continue
        if (pageTexts[p].toLowerCase().includes(titleLower)) {
          truePage = p + 1
          break
        }
      }
    }
    
    console.log(`"${section.title}": DB=${section.pageStart} -> Gerçek=${truePage}`)
    if (truePage !== -1) {
      updates.push({ id: section.id, title: section.title, newStart: truePage })
    }
  }

  // DB güncelle
  console.log('\n--- DB GÜNCELLENİYOR ---')
  for (let i = 0; i < updates.length; i++) {
    const u = updates[i]
    const nextStart = updates[i + 1]?.newStart || pageTexts.length + 1
    const newEnd = nextStart - 1
    
    console.log(`"${u.title}": pageStart=${u.newStart}, pageEnd=${newEnd}`)
    await prisma.section.update({
      where: { id: u.id },
      data: { pageStart: u.newStart, pageEnd: newEnd }
    })
  }

  console.log('\nBitti!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
