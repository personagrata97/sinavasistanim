import { prisma } from "../src/lib/prisma"

async function run() {
  console.log("🚀 [SINAV TARİHİ SIFIRLAMA] Tüm derslerin sınav tarihleri temizleniyor...")

  const updated = await prisma.course.updateMany({
    data: {
      examDate: null
    }
  })

  console.log(`✅ Toplam ${updated.count} dersin sınav tarihi veritabanında 'null' olarak sıfırlandı!`)
}

run().catch(console.error).finally(() => prisma.$disconnect())
