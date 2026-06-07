import { prisma } from '../src/lib/prisma'

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' },
    include: {
      sections: {
        select: { id: true, title: true, processed: true }
      }
    }
  })
  
  if (!course) {
    console.log("Course not found!")
    return
  }
  
  const processed = course.sections.filter(s => s.processed)
  const waiting = course.sections.filter(s => !s.processed)
  
  console.log(`DURUM: ${course.status}`)
  console.log(`İŞLENEN BÖLÜM: ${processed.length}`)
  console.log(`BEKLEYEN BÖLÜM: ${waiting.length}`)
  
  waiting.forEach(w => console.log(`- BEKLİYOR: ${w.title}`))
}
main()
