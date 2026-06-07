import { prisma } from '../src/lib/prisma'
import { verifyNotesAgainstSource, smartInjectCourseNotes } from '../src/lib/ai-service'

async function main() {
  console.log("🚀 Retroactive Ground Truth Checker başlatılıyor...");

  const course = await prisma.course.findUnique({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' },
    include: {
      sections: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!course) {
    console.error("❌ Ders bulunamadı!");
    return;
  }

  // Sadece 1, 2 ve 3 numaralı indexteki bölümleri al (0 Kısaltmalar, 1 Bölüm 1, 2 Bölüm 2, 3 Bölüm 3)
  const targetSections = [course.sections[1], course.sections[2], course.sections[3]];

  for (const section of targetSections) {
    if (!section) continue;
    console.log(`\n======================================================`);
    console.log(`🔍 İnceleniyor: ${section.title}`);
    console.log(`======================================================`);

    if (!section.notes || !section.rawContent) {
      console.log(`⚠️ Not veya Raw Content eksik, atlanıyor.`);
      continue;
    }

    try {
      console.log(`[1/3] Ground Truth Denetimi Yapılıyor...`);
      const verification = await verifyNotesAgainstSource(
        section.rawContent,
        section.notes,
        section.title
      );

      console.log(`📊 Doğrulama Skoru: ${verification.score}/100`);

      if (verification.score === 100 && verification.missingTopics.length === 0) {
        console.log(`✅ Bu bölüm zaten kusursuz. Hiçbir eksik konu bulunmadı. Atlanıyor.`);
        continue;
      }

      console.log(`⚠️ Eksik Konular Tespit Edildi:`);
      verification.missingTopics.forEach(t => console.log(`  - ${t}`));
      
      console.log(`\n[2/3] Smart Inject (Akıllı Yama) Çalıştırılıyor...`);
      const patchedNotes = await smartInjectCourseNotes(
        section.rawContent,
        section.notes,
        section.title,
        verification.missingTopics,
        verification.issues
      );

      if (!patchedNotes || patchedNotes.length < 500) {
        console.error(`❌ Yama işlemi başarısız veya dönen not çok kısa. İşlem iptal ediliyor.`);
        continue;
      }

      console.log(`✅ Yama Başarılı! Eski Uzunluk: ${section.notes.length}, Yeni Uzunluk: ${patchedNotes.length}`);

      console.log(`[3/3] Yamalanmış Notlar Tekrar Doğrulanıyor...`);
      const finalVerification = await verifyNotesAgainstSource(
        section.rawContent,
        patchedNotes,
        section.title
      );

      console.log(`📊 Final Skoru: ${finalVerification.score}/100`);

      // Veritabanını Güncelle
      await prisma.section.update({
        where: { id: section.id },
        data: {
          notes: patchedNotes,
          verificationScore: finalVerification.score,
          verificationIssues: JSON.stringify({
            missingTopics: finalVerification.missingTopics || [],
            issues: finalVerification.issues || [],
            suggestions: finalVerification.suggestions || [],
            retroactivePatchApplied: true,
            originalScore: verification.score
          })
        }
      });

      console.log(`💾 Veritabanı başarıyla güncellendi: ${section.title}`);

    } catch (e: any) {
      console.error(`❌ Hata oluştu (${section.title}):`, e.message);
    }
  }

  console.log(`\n🎉 Tüm işlemler tamamlandı.`);
}

main().catch(console.error);
