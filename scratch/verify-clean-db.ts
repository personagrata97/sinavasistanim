import { prisma } from "../src/lib/prisma"

async function run() {
  // Wipe leftover UserQuestionAnswer records to achieve absolute pristine state
  await prisma.userQuestionAnswer.deleteMany({})

  const users = await prisma.user.count()
  const programs = await prisma.program.count()
  const courses = await prisma.course.count()
  const sections = await prisma.section.count()
  const questions = await prisma.question.count()
  const flashcards = await prisma.flashcard.count()
  const levelTests = await prisma.levelTest.count()
  const studyPlans = await prisma.studyPlan.count()
  const mockResults = await prisma.userMockExamResult.count()
  const userProgress = await prisma.userFlashcardProgress.count()
  const userAnswers = await prisma.userQuestionAnswer.count()

  console.log("=== VERİTABANI ÖZETİ (TEMİZLİK SONRASI SAĞLIK RAPORU) ===")
  console.log(`👤 Kullanıcı Sayısı (User): ${users}`)
  console.log(`🌐 Program Sayısı (Program): ${programs}`)
  console.log(`📚 Ders Sayısı (Course): ${courses}`)
  console.log(`🔷 Bölüm Sayısı (Section): ${sections}`)
  console.log(`🧪 Toplam Soru (Question): ${questions}`)
  console.log(`📇 Toplam Flashcard (Flashcard): ${flashcards}`)
  console.log(`📝 Seviye Tespit Sınavları (LevelTest): ${levelTests}`)
  console.log(`📅 Çalışma Planları (StudyPlan): ${studyPlans}`)
  console.log(`🏆 Deneme Sınavı Sonuçları (MockExamResult): ${mockResults}`)
  console.log(`📈 Flashcard İlerleme Kayıtları (UserFlashcardProgress): ${userProgress}`)
  console.log(`📊 Soru Cevaplama Kayıtları (UserQuestionAnswer): ${userAnswers}`)
  console.log("=======================================================")
}

run().catch(console.error).finally(() => prisma.$disconnect())
