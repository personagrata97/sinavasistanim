import "dotenv/config"
import { prisma } from "../src/lib/prisma"

async function checkIntegrity() {
  console.log("🔍 [INTEGRITY_CHECK] Kurs Bütünlük ve Eksiksiz Veri Denetimi Başlatılıyor...\n")

  const course = await prisma.course.findFirst({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          questions: true,
          flashcards: true
        }
      }
    }
  })

  if (!course) {
    console.error("❌ HATA: Kurs veritabanında bulunamadı!")
    return
  }

  console.log(`📚 Kurs: "${course.name}" (${course.sections.length} Bölüm)`)
  console.log("--------------------------------------------------------------------------------")
  
  let totalNotesChars = 0
  let totalCards = 0
  let totalQuestions = 0
  let issuesFound = 0

  for (const sec of course.sections) {
    const notesLength = sec.notes ? sec.notes.length : 0
    const cardsCount = sec.flashcards.length
    const questionsCount = sec.questions.length

    totalNotesChars += notesLength
    totalCards += cardsCount
    totalQuestions += questionsCount

    console.log(`🔷 Bölüm ${sec.order}: "${sec.title}"`)
    console.log(`   📝 Ders Notu: ${notesLength > 0 ? `✅ ${notesLength} karakter` : "❌ EKSİK"}`)
    console.log(`   📇 Flashcard: ${cardsCount > 0 ? `✅ ${cardsCount} adet` : "❌ EKSİK"}`)
    console.log(`   🧪 Sınav Sorusu: ${questionsCount > 0 ? `✅ ${questionsCount} adet` : "❌ EKSİK"}`)

    // Kritik kontrol
    if (notesLength < 500 || cardsCount === 0 || questionsCount === 0) {
      console.log(`   🚨 UYARI: Bu bölümün kritik içerik eksiği var!`)
      issuesFound++
    }
    console.log("")
  }

  console.log("--------------------------------------------------------------------------------")
  console.log("📊 GENEL KURS İSTATİSTİKLERİ:")
  console.log(`📈 Toplam Ders Notu Karakteri: ${totalNotesChars} karakter`)
  console.log(`📇 Toplam Flashcard Sayısı: ${totalCards} adet`)
  console.log(`🧪 Toplam Sınav Sorusu Sayısı: ${totalQuestions} adet`)
  console.log("--------------------------------------------------------------------------------")

  if (issuesFound === 0) {
    console.log("🎉 TEBRİKLER! Kurs içeriği %100 eksiksiz ve bütünlük testinden başarıyla geçti! Tüm konular için notlar, sorular ve kartlar eksiksiz üretilmiş.")
  } else {
    console.log(`⚠️ DİKKAT: ${issuesFound} bölümde eksik veya yarım kalmış içerik tespit edildi. Lütfen bu bölümler için AI motorunu tekrar tetikleyin.`)
  }
}

checkIntegrity().catch(console.error).finally(() => prisma.$disconnect())
