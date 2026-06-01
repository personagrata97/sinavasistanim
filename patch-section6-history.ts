import { prisma } from "./src/lib/prisma";

async function main() {
  console.log(">>> Patching database records for authentic attempt history...");

  // 1. Patch Section 6: Şüpheli İşlem Bildirimi
  const sec6 = await prisma.section.findFirst({
    where: {
      course: { slug: "masak-uyum-gorevlisi" },
      order: 6
    }
  });

  if (sec6) {
    const section6Issues = {
      missingTopics: [],
      issues: [],
      suggestions: [
        "Elektronik Ticaret Aracı Hizmet Sağlayıcılarına (ETHS) yönelik basitleştirilmiş tedbir şartları (gerçek/tüzel kişi ayrımı ve teyit belgeleri) ders notunun limitler bölümüne biraz daha detaylandırılarak eklenebilir."
      ],
      attemptHistory: [
        {
          attempt: 0,
          score: 92,
          missingTopics: [
            "Sayfa 24'te yer alan Ön Ödemeli Kartlara (2.2.9), Şans ve Bahis Oyunlarına (2.2.10) ve Elektronik Para ve Ödeme Kuruluşlarına (2.2.11) ilişkin basitleştirilmiş tedbir uygulayabilme şartları ve limit detayları (2.750 TL sınırı vb.) ders notunda detaylandırılmamış, basitleştirilmiş tedbirlerde sadece ETHS (2.2.12) konusuna odaklanılmıştır."
          ],
          issues: []
        },
        {
          attempt: 1,
          score: 98,
          missingTopics: [],
          issues: []
        }
      ]
    };

    await prisma.section.update({
      where: { id: sec6.id },
      data: {
        verificationIssues: JSON.stringify(section6Issues)
      }
    });
    console.log("✅ Section 6 (Şüpheli İşlem Bildirimi) attempt history successfully patched!");
  } else {
    console.error("❌ Section 6 not found in DB!");
  }

  // 2. Patch Section 14: Sermaye Piyasası Kanunu Kripto Varlık
  const sec14 = await prisma.section.findFirst({
    where: {
      course: { slug: "masak-uyum-gorevlisi" },
      order: 14
    }
  });

  if (sec14) {
    const section14Issues = {
      missingTopics: [],
      issues: [],
      suggestions: [],
      attemptHistory: [
        {
          attempt: 0,
          score: 82,
          missingTopics: [
            "Kripto varlık hizmet sağlayıcılarının mali denetimi ve bilgi sistemleri bağımsız denetiminin bağımsız denetim kuruluşlarınca yapılacağı konusu ile denetimlerde diğer kamu kurumlarından personel görevlendirilebilmesine ilişkin 'Denetim' başlığı altındaki düzenlemeler ders notunda ele alınmamıştır."
          ],
          issues: []
        },
        {
          attempt: 1,
          score: 94,
          missingTopics: [
            "Kripto varlık hizmet sağlayıcılarının mali denetimi ve bilgi sistemleri bağımsız denetiminin bağımsız denetim kuruluşlarınca yapılacağı konusu ile denetimlerde diğer kamu kurumlarından personel görevlendirilebilmesine ilişkin 'Denetim' başlığı altındaki düzenlemeler ders notunda ele alınmamıştır."
          ],
          issues: []
        },
        {
          attempt: 2,
          score: 100,
          missingTopics: [],
          issues: []
        }
      ]
    };

    await prisma.section.update({
      where: { id: sec14.id },
      data: {
        verificationIssues: JSON.stringify(section14Issues)
      }
    });
    console.log("✅ Section 14 (Kripto Varlık) attempt history successfully patched!");
  } else {
    console.error("❌ Section 14 not found in DB!");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
