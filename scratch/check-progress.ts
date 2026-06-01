import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const course = await prisma.course.findFirst({
    where: { name: { contains: "Bilgi" } },
    include: {
      sections: true,
      questions: true,
      flashcards: true,
    }
  })

  if (!course) {
    console.log("Kurs bulunamadı.")
    return
  }

  const processedSections = course.sections.filter(s => s.processed)
  const successSections = course.sections.filter(s => s.verificationScore && s.verificationScore >= 80)
  
  console.log(`Kurs: ${course.name}`)
  console.log(`Toplam Bölüm: ${course.sections.length}`)
  console.log(`İşlenen Bölüm: ${processedSections.length}`)
  console.log(`Başarılı (Skor >= 80) Bölüm: ${successSections.length}`)
  console.log(`Toplam Soru: ${course.questions.length}`)
  console.log(`Toplam Flashcard: ${course.flashcards.length}`)
  
  console.log("\nSon 3 İşlenen Bölüm:")
  const recent = processedSections.slice(-3)
  for (const s of recent) {
    console.log(`- ${s.title} (Skor: ${s.verificationScore})`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
