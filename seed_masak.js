const { PrismaClient } = require('./node_modules/.prisma/client')

const prisma = new PrismaClient()

const MASAK_COURSES = [
  { name: "MASAK'ın Yapısı, Görevleri ve Koordinasyon", slug: "masak-yapisi-gorevleri", order: 1, description: "MASAK'ın idari yapısı, Mali İstihbarat Birimi (MİB) fonksiyonu, Mali Suçlarla Mücadele Koordinasyon Kurulu ve kurumlar arası iş birliği." },
  { name: "5549 Sayılı Kanun ve İlgili Mevzuat", slug: "5549-sayili-kanun", order: 2, description: "Suç Gelirlerinin Aklanmasının Önlenmesi Hakkında Kanun, ilgili yönetmelikler, tebliğler ve normlar hiyerarşisi." },
  { name: "6415 Sayılı Kanun — Terörizmin Finansmanı", slug: "6415-sayili-kanun", order: 3, description: "Terörizmin Finansmanının Önlenmesi Hakkında Kanun, suç tanımları, yaptırımlar ve malvarlığı dondurma mekanizmaları." },
  { name: "Uluslararası Standartlar — FATF 40 Tavsiye", slug: "fatf-uluslararasi-standartlar", order: 4, description: "FATF (Mali Eylem Görev Gücü) tavsiyeleri, gri/kara liste süreçleri, karşılıklı değerlendirme ve uluslararası iş birliği." },
  { name: "Suç Gelirleri ve Aklama Suçu", slug: "suc-gelirleri-aklama", order: 5, description: "Aklama suçunun unsurları, aklama yöntemleri (yerleştirme, ayrıştırma, bütünleştirme), öncül suçlar ve cezai yaptırımlar." },
  { name: "Ulusal Risk Değerlendirmesi ve Strateji", slug: "ulusal-risk-degerlendirmesi", order: 6, description: "Türkiye Ulusal Risk Değerlendirmesi, strateji belgeleri, eylem planları ve sektörel risk haritaları." },
  { name: "Müşterinin Tanınması (KYC)", slug: "musterinin-taninmasi-kyc", order: 7, description: "Kimlik tespiti süreçleri, uzaktan kimlik tespiti, tüzel kişi tespiti, basitleştirilmiş ve sıkılaştırılmış tedbirler." },
  { name: "Şüpheli İşlem Bildirimi (ŞİB)", slug: "supheli-islem-bildirimi", order: 8, description: "Şüphenin anatomisi, bildirim kriterleri, ŞİB süreçleri, gizlilik yükümlülüğü (tipping-off yasağı) ve yasal süreler." },
  { name: "Uyum Programı ve İç Kontrol", slug: "uyum-programi-ic-kontrol", order: 9, description: "Uyum görevlisinin atanması, görev ve sorumlulukları, risk temelli yaklaşım, iç kontrol ve eğitim süreçleri." },
  { name: "PEP, Riskli Müşteriler ve Sektörel Riskler", slug: "pep-riskli-musteriler", order: 10, description: "Siyasi nüfuz sahibi kişiler (PEP), riskli ülkeler, sektör bazlı risk kategorileri ve kripto varlık hizmet sağlayıcılar." },
  { name: "Muhafaza, İbraz ve Bilgi Verme Yükümlülükleri", slug: "muhafaza-ibraz-yukumlulukleri", order: 11, description: "8 yıl saklama kuralı, devamlı bilgi verme, bilgi ve belge verme zorunluluğu, elektronik tebligat." },
  { name: "KİSYF — Kitle İmha Silahları Finansmanı", slug: "kisyf-kitle-imha-finansmani", order: 12, description: "Kitle imha silahlarının yayılmasının finansmanının önlenmesi, BM yaptırımları ve dondurma kararları." },
]

async function main() {
  // Delete old 2-course MASAK entries if they exist
  try { await prisma.course.deleteMany({ where: { slug: { in: ["hukuki-cerceve", "uyum-yonetimi"] } } }) } catch(e) {}

  let masakProgram = await prisma.program.findUnique({ where: { slug: "masak" } })
  if (!masakProgram) {
    console.log("MASAK program not found, creating...")
    masakProgram = await prisma.program.create({ data: { slug: "masak", name: "Uyum Görevlisi Sınavı", aiMode: "law", description: "MASAK Uyum Görevlisi Yetkilendirme Sınavı — AML/CFT mevzuatı, şüpheli işlem bildirimi ve risk yönetimi" } })
  }

  console.log("MASAK program:", masakProgram.id)

  for (const course of MASAK_COURSES) {
    const existing = await prisma.course.findUnique({ where: { slug: course.slug } })
    if (!existing) {
      await prisma.course.create({ data: { ...course, programId: masakProgram.id } })
      console.log("+ Created:", course.name)
    } else {
      console.log("= Exists:", course.name)
    }
  }

  const count = await prisma.course.count({ where: { program: { slug: "masak" } } })
  console.log("\nTotal MASAK courses in DB:", count)
}

main().catch(console.error).finally(() => prisma.$disconnect())
