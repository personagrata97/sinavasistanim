import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./prisma/dev.db" 
    }
  }
})

async function main() {
  const courses = await prisma.course.findMany({
    orderBy: { order: 'asc' },
    include: { sections: { orderBy: { order: 'asc' } } }
  })
  
  if (courses.length < 2) {
    console.log("Yeterli kurs bulunamadı.")
    return
  }

  const bolum1 = courses[0] 
  const bolum2 = courses[1] 

  console.log(`Bölüm 1 bulundu: ${bolum1.name} (ID: ${bolum1.id})`)
  console.log(`Bölüm 2 bulundu: ${bolum2.name} (ID: ${bolum2.id})`)

  // 1. Bölüm 1'in SADECE Flashcardlarını Sil ve statüyü update et ki eksik diye üretsin
  // Wait, if I just delete flashcards, the background worker won't automatically start if processed=true.
  // The processInBackground checks `processed: false` sections.
  // Instead of relying on full course reprocessing, let's just mark Section 1's processed = false, 
  // but wait, then it will regenerate notes too.
  // Is there a way to ONLY generate flashcards? 
  // Wait! We created a `refineSectionNotes` server action in `src/lib/actions.ts` that takes an action parameter like "regen_flashcards".
  // Let's call that action!
  
}

main().catch(console.error).finally(() => prisma.$disconnect())
