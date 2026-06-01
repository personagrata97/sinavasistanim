const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const path = require("path");

const dbPath = path.resolve(process.cwd(), "dev.db");
const dbUrl = `file:${dbPath}`;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

const updates = [
  { order: 1, title: "MASAK’ın Kuruluşu, Görevleri ve Yasal Yetkileri", module: "Modül 1" },
  { order: 2, title: "Suç Gelirlerine ve Malvarlığı Değerlerine El Koyma Hukuku", module: "Modül 1" },
  { order: 3, title: "Terörün Finansmanı Kaynakları ve MASAK Denetim Elemanları", module: "Modül 1" },
  { order: 4, title: "Müşterinin Tanınması ve Kimlik Tespiti Standartları", module: "Modül 2" },
  { order: 5, title: "Üçüncü Tarafa Güven İlkesi ve Riskli Ülke Sınırlandırmaları", module: "Modül 2" },
  { order: 6, title: "Şüpheli İşlem Bildirimi (ŞİB) ve İşlemin Reddi Esasları", module: "Modül 2" },
  { order: 7, title: "Yükümlülük Denetimi ve Uyum Programı Yapılandırılması", module: "Modül 2" },
  { order: 8, title: "Uyum Görevlisinin Atanması, Nitelikleri ve Şartları", module: "Modül 2" },
  { order: 9, title: "Elektronik Tebligat (E-Tebligat) Usul ve Esasları", module: "Modül 2" },
  { order: 10, title: "Uluslararası FATF Standartları, Gri Liste ve İzleme Süreçleri", module: "Modül 1" },
  { order: 11, title: "Malvarlığının Dondurulması Komisyonu ve Ulusal Koordinasyon", module: "Modül 1" },
  { order: 12, title: "Kitle İmha Silahlarının Yayılması ve Finansmanının Önlenmesi", module: "Modül 1" },
  { order: 13, title: "Ödeme ve Elektronik Para Kuruluşları Mevzuatı", module: "Modül 2" },
  { order: 14, title: "Sermaye Piyasası Kanunu Kripto Varlık Tanım ve Kapsamı", module: "Modül 1" },
  { order: 15, title: "Dijital Cüzdan Hizmetleri ve Ödeme Sağlayıcıları Yönetmeliği", module: "Modül 2" },
  { order: 16, title: "Kripto Varlık Hizmet Sağlayıcıları Faaliyet ve Organizasyon Tebliği", module: "Modül 2" },
  { order: 17, title: "Yükümlülük İhlali Eksiklik Tamamlama Süreleri ve İhtarlar", module: "Modül 2" },
  { order: 18, title: "MASAK İdari Para Cezaları ve Cezai Yükümlülükler", module: "Modül 2" }
];

async function main() {
  console.log("🚀 MASAK Bölüm başlıkları ve modülleri yeniden senkronize ediliyor...");
  
  const course = await prisma.course.findUnique({
    where: { slug: "masak-uyum-gorevlisi" }
  });
  
  if (!course) {
    console.error("Course not found!");
    process.exit(1);
  }

  for (const update of updates) {
    await prisma.section.updateMany({
      where: {
        courseId: course.id,
        order: update.order
      },
      data: {
        title: update.title,
        module: update.module
      }
    });
    console.log(`✅ Senkronize edildi: Bölüm ${update.order} -> "${update.title}" (${update.module})`);
  }
  
  console.log("🎉 Başarıyla tamamlandı!");
}

main().catch(console.error).finally(() => prisma.$disconnect());