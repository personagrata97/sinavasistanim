import { prisma } from "../src/lib/prisma"

async function run() {
  console.log("🧹 [DÜRÜST VE KESİN TEMİZLİK] Veritabanındaki tüm dersleri iskelet haline getirme işlemi başlatılıyor...\n")

  // 1. Tüm dersleri alalım
  const courses = await prisma.course.findMany({
    orderBy: { order: "asc" }
  })

  if (courses.length === 0) {
    console.log("❌ Veritabanında hiçbir ders bulunamadı!")
    return
  }

  console.log(`📚 Toplam ${courses.length} ders bulundu. Hepsi iskelet olarak korunacak, içerikleri sıfırlanacaktır.`)
  console.log("--------------------------------------------------------------------------------")

  for (const course of courses) {
    console.log(`\n🔄 "${course.name}" (${course.slug}) temizleniyor...`)

    // A. Bu derse ait tüm soruları sil
    const deletedQuestions = await prisma.question.deleteMany({
      where: { courseId: course.id }
    })
    console.log(`   - Soru tablosundan ${deletedQuestions.count} kayıt silindi.`)

    // B. Bu derse ait tüm flashcard'ları sil
    const deletedFlashcards = await prisma.flashcard.deleteMany({
      where: { courseId: course.id }
    })
    console.log(`   - Flashcard tablosundan ${deletedFlashcards.count} kayıt silindi.`)

    // C. Bu derse ait tüm LevelTest'leri sil
    const deletedLevelTests = await prisma.levelTest.deleteMany({
      where: { courseId: course.id }
    })
    console.log(`   - Seviye Tespit Sınavı tablosundan ${deletedLevelTests.count} kayıt silindi.`)

    // D. Bu derse ait tüm StudyPlan'leri sil
    const deletedStudyPlans = await prisma.studyPlan.deleteMany({
      where: { courseId: course.id }
    })
    console.log(`   - Çalışma Planı tablosundan ${deletedStudyPlans.count} kayıt silindi.`)

    // E. Bu derse ait tüm MockExamResult'ları sil
    const deletedMockResults = await prisma.userMockExamResult.deleteMany({
      where: { courseId: course.id }
    })
    console.log(`   - Deneme Sınavı Sonuçları tablosundan ${deletedMockResults.count} kayıt silindi.`)

    // F. Dersin bölümlerini iskelet (pristine) haline getir:
    // RawContent (ham metin), title, order, pageStart, pageEnd ve courseId korunur.
    // notes, summary, importance, topics, verificationScore, verificationIssues null'lanır ve processed = false yapılır.
    const resetSections = await prisma.section.updateMany({
      where: { courseId: course.id },
      data: {
        notes: null,
        summary: null,
        importance: null,
        topics: null,
        verificationScore: 0,
        verificationIssues: null,
        processed: false
      }
    })
    console.log(`   - ${resetSections.count} bölüm sıfır kilometre haline getirildi (RawContent korundu).`)

    // G. Dersin genel ilerleme durumunu sıfırla (pdfPath, geminiFileUri vb. dosyaları koruyarak)
    await prisma.course.update({
      where: { id: course.id },
      data: {
        processedPages: 0,
        status: "not_started"
      }
    })
    console.log(`   - Dersin durumu 'not_started' yapıldı ve işlenen sayfa sayısı sıfırlandı.`)
  }

  console.log("\n--------------------------------------------------------------------------------")
  console.log("✨ [TEMİZLİK TAMAMLANDI] Tüm dersler dürüstçe iskelet durumuna getirildi ve sıfır kilometre oldu!")
}

run()
  .catch((err) => {
    console.error("❌ Temizlik sırasında bir hata oluştu:", err)
  })
  .finally(() => prisma.$disconnect())
