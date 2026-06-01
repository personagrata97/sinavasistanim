import * as fs from "fs"
import * as path from "path"

async function run() {
  console.log("🧹 [ARINMA SEANSI] Proje kök dizinindeki tüm geçici debug, log ve yedek veritabanı kırıntıları temizleniyor...\n")

  const rootDir = path.resolve(__dirname, "..")

  // Silinecek geçici dosyaların tam listesi
  const filesToDelete = [
    "flashcard_debug_1779783492898.txt",
    "flashcard_debug_1779783634780.txt",
    "question_debug_1779783286063.txt",
    "question_debug_1779783557815.txt",
    "question_debug_1779783710540.txt",
    "question_debug_1779783793160.txt",
    "raw_contents.txt",
    "test-output.txt",
    "dev_25mayısakşam2358.db",
    "dev.db-shm",
    "dev.db-wal"
  ]

  let deletedCount = 0

  filesToDelete.forEach(file => {
    const filePath = path.join(rootDir, file)
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
        console.log(`🗑️ Kırıntı Temizlendi: ${file}`)
        deletedCount++
      } catch (err) {
        console.error(`❌ ${file} silinirken hata:`, err)
      }
    }
  })

  console.log(`\n✨ Toplam ${deletedCount} adet geçici dosya ve yedek kırıntısı diskten kalıcı olarak temizlendi!`)
}

run().catch(console.error)
