const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(process.cwd(), "dev.db");
const db = new Database(dbPath);

const updates = [
  { order: 1, title: "MASAK’ın Kuruluşu, Görevleri ve Yasal Yetkileri", module: "Modül 1", pageStart: 1, pageEnd: 4 },
  { order: 2, title: "Suç Gelirlerine ve Malvarlığı Değerlerine El Koyma Hukuku", module: "Modül 1", pageStart: 5, pageEnd: 7 },
  { order: 3, title: "Terörün Finansmanı Kaynakları ve MASAK Denetim Elemanları", module: "Modül 1", pageStart: 8, pageEnd: 16 },
  { order: 4, title: "Müşterinin Tanınması ve Kimlik Tespiti Standartları", module: "Modül 2", pageStart: 17, pageEnd: 20 },
  { order: 5, title: "Üçüncü Tarafa Güven İlkesi ve Riskli Ülke Sınırlandırmaları", module: "Modül 2", pageStart: 21, pageEnd: 24 },
  { order: 6, title: "Şüpheli İşlem Bildirimi (ŞİB) ve İşlemin Reddi Esasları", module: "Modül 2", pageStart: 25, pageEnd: 27 },
  { order: 7, title: "Yükümlülük Denetimi ve Uyum Programı Yapılandırılması", module: "Modül 2", pageStart: 28, pageEnd: 32 },
  { order: 8, title: "Uyum Görevlisinin Atanması, Nitelikleri ve Şartları", module: "Modül 2", pageStart: 32, pageEnd: 34 },
  { order: 9, title: "Elektronik Tebligat (E-Tebligat) Usul ve Esasları", module: "Modül 2", pageStart: 34, pageEnd: 37 },
  { order: 10, title: "Uluslararası FATF Standartları, Gri Liste ve İzleme Süreçleri", module: "Modül 1", pageStart: 37, pageEnd: 41 },
  { order: 11, title: "Malvarlığının Dondurulması Komisyonu ve Ulusal Koordinasyon", module: "Modül 1", pageStart: 41, pageEnd: 45 },
  { order: 12, title: "Kitle İmha Silahlarının Yayılması ve Finansmanının Önlenmesi", module: "Modül 1", pageStart: 45, pageEnd: 49 },
  { order: 13, title: "Ödeme ve Elektronik Para Kuruluşları Mevzuatı", module: "Modül 2", pageStart: 49, pageEnd: 51 },
  { order: 14, title: "Sermaye Piyasası Kanunu Kripto Varlık Tanım ve Kapsamı", module: "Modül 1", pageStart: 51, pageEnd: 54 },
  { order: 15, title: "Dijital Cüzdan Hizmetleri ve Ödeme Sağlayıcıları Yönetmeliği", module: "Modül 2", pageStart: 54, pageEnd: 58 },
  { order: 16, title: "Kripto Varlık Hizmet Sağlayıcıları Faaliyet ve Organizasyon Tebliği", module: "Modül 2", pageStart: 58, pageEnd: 61 },
  { order: 17, title: "Yükümlülük İhlali Eksiklik Tamamlama Süreleri ve İhtarlar", module: "Modül 2", pageStart: 61, pageEnd: 73 },
  { order: 18, title: "MASAK İdari Para Cezaları ve Cezai Yükümlülükler", module: "Modül 2", pageStart: 74, pageEnd: 81 }
];

async function main() {
  console.log("🚀 MASAK Ders Bilgileri, Başlıkları ve Sayfa Aralıkları Kusursuz Senkronize Ediliyor...");

  const course = db.prepare("SELECT id FROM Course WHERE slug = 'masak-uyum-gorevlisi'").get();
  
  if (!course) {
    console.error("Course not found!");
    process.exit(1);
  }

  const courseId = course.id;

  // 1. Delete all existing flashcards & questions for MASAK to start clean
  console.log("🗑️ Eski Sorular ve Flashcardlar temizleniyor...");
  db.prepare("DELETE FROM Question WHERE courseId = ?").run(courseId);
  db.prepare("DELETE FROM Flashcard WHERE courseId = ?").run(courseId);

  // 2. Sync all 18 sections with clean titles, correct modules, and exact page ranges
  const updateSection = db.prepare(`
    UPDATE Section 
    SET title = ?, 
        module = ?, 
        pageStart = ?, 
        pageEnd = ?, 
        processed = 0, 
        notes = NULL, 
        verificationScore = NULL, 
        verificationIssues = NULL
    WHERE courseId = ? AND "order" = ?
  `);

  const transaction = db.transaction(() => {
    for (const u of updates) {
      updateSection.run(u.title, u.module, u.pageStart, u.pageEnd, courseId, u.order);
      console.log(`✅ Senkronize edildi: Bölüm ${u.order} -> "${u.title}" | Sayfa ${u.pageStart}-${u.pageEnd} | ${u.module}`);
    }
  });

  transaction();

  // 3. Reset course status to not_started
  db.prepare("UPDATE Course SET status = 'not_started', processedPages = 0 WHERE id = ?").run(courseId);

  console.log("🎉 MASAK Veri Tabanı Mükemmel Şekilde Senkronize Edildi ve Sıfırlandı!");
}

main()
  .catch(console.error)
  .finally(() => db.close());
