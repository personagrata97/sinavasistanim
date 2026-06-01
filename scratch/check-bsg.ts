import { prisma } from "../src/lib/prisma"

async function run() {
  const course = await prisma.course.findUnique({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" }
  })
  if (course) {
    console.log("=== BİLGİ SİSTEMLERİ GÜVENLİĞİ BİLGİLERİ ===")
    console.log(`ID: ${course.id}`)
    console.log(`PDF Path: ${course.pdfPath}`)
    console.log(`Gemini File URI: ${course.geminiFileUri}`)
    console.log(`Gemini File URIs: ${course.geminiFileUris}`)
    console.log(`Status: ${course.status}`)
    console.log(`Processed Pages: ${course.processedPages}`)
  } else {
    console.log("❌ Bilgi Sistemleri Güvenliği dersi veritabanında bulunamadı!")
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
