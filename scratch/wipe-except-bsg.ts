import { prisma } from "../src/lib/prisma"
import * as fs from "fs"
import * as path from "path"

async function run() {
  console.log("🚀 [TAM ARINMA VE TEMİZLİK] Bilgi Sistemleri Güvenliği Dışındaki Tüm Derslerin Sıfırlanması Başlıyor...\n")

  // 1. bd-bilgi-sistemleri-guvenligi dışındaki tüm dersleri alalım
  const otherCourses = await prisma.course.findMany({
    where: {
      slug: { not: "bd-bilgi-sistemleri-guvenligi" }
    }
  })

  console.log(`📚 Bilgi Güvenliği hariç toplam ${otherCourses.length} adet ders işlenecektir.`)
  console.log("--------------------------------------------------------------------------------")

  for (const course of otherCourses) {
    console.log(`\n🧹 "${course.name}" (${course.slug}) temizleniyor...`)

    // A. Bu dersin veritabanındaki tüm Bölümlerini (Section) tamamen SİL
    const deletedSections = await prisma.section.deleteMany({
      where: { courseId: course.id }
    })
    console.log(`   - Veritabanından ${deletedSections.count} adet bölüm ve ham metin (rawContent) TAMAMEN SİLİNDİ.`)

    // B. Bu dersin veritabanındaki Soru, Flashcard, LevelTest vb. kalıntılarını tamamen temizle
    const deletedQ = await prisma.question.deleteMany({ where: { courseId: course.id } })
    const deletedFC = await prisma.flashcard.deleteMany({ where: { courseId: course.id } })
    const deletedLT = await prisma.levelTest.deleteMany({ where: { courseId: course.id } })
    const deletedSP = await prisma.studyPlan.deleteMany({ where: { courseId: course.id } })
    const deletedMR = await prisma.userMockExamResult.deleteMany({ where: { courseId: course.id } })

    console.log(`   - Kalıntılar temizlendi: Soru: ${deletedQ.count}, Flashcard: ${deletedFC.count}, Seviye Sınavı: ${deletedLT.count}, Plan: ${deletedSP.count}, Deneme: ${deletedMR.count}`)

    // C. Dersin kolonlarını ilk günkü gibi tertemiz, pdf yüklenmemiş haline getir
    await prisma.course.update({
      where: { id: course.id },
      data: {
        pdfPath: null,
        geminiFileUri: null,
        geminiFileUris: null,
        totalPages: 0,
        processedPages: 0,
        status: "not_started"
      }
    })
    console.log(`   - Dersin durumu 'not_started' olarak sıfırlandı, PDF referansları silindi.`)
  }

  // ================= 3. FİZİKSEL DOSYA TEMİZLİĞİ =================
  console.log("\n--------------------------------------------------------------------------------")
  console.log("💾 Disk üzerindeki PDF ve Geçici Dosyaların Temizliği Başlıyor...")

  const rootUploadsDir = path.resolve(__dirname, "..", "uploads")
  const publicUploadsDir = path.resolve(__dirname, "..", "public", "uploads")

  // A. uploads/ klasörü temizliği (Sadece Bilgi Güvenliği PDF'i korunacak)
  const bsgPdfFilename = "bd-bilgi-sistemleri-guvenligi-1779783566521.pdf"
  if (fs.existsSync(rootUploadsDir)) {
    const files = fs.readdirSync(rootUploadsDir)
    files.forEach(file => {
      if (file !== bsgPdfFilename) {
        try {
          fs.unlinkSync(path.join(rootUploadsDir, file))
          console.log(`🗑️ Ana Klasörden Silindi: uploads/${file}`)
        } catch (e) {
          console.error(`❌ uploads/${file} silinirken hata:`, e)
        }
      } else {
        console.log(`✅ Ana Klasörde Korundu: uploads/${file}`)
      }
    })
  }

  // B. public/uploads/ klasöründeki her şeyi tamamen sil (hepsi geçici/çöp dosya)
  if (fs.existsSync(publicUploadsDir)) {
    const files = fs.readdirSync(publicUploadsDir)
    files.forEach(file => {
      try {
        fs.unlinkSync(path.join(publicUploadsDir, file))
        console.log(`🗑️ Geçici Klasörden Silindi: public/uploads/${file}`)
      } catch (e) {
        console.error(`❌ public/uploads/${file} silinirken hata:`, e)
      }
    })
  }

  console.log("\n--------------------------------------------------------------------------------")
  console.log("✨ [TÜM SİSTEM ARINDI] Bilgi Güvenliği hariç tüm dersler 100% boş iskelet durumuna getirildi ve disk temizlendi!")
}

run()
  .catch((err) => {
    console.error("❌ Hata oluştu:", err)
  })
  .finally(() => prisma.$disconnect())
