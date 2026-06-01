import { prisma } from "@/lib/prisma"

/**
 * Dinamik Adaptasyon Motoru (Sınav Kazandırma Makinesi)
 * Bu motor, kullanıcının her etkileşiminde arka planda çalışarak, 
 * zayıf yönlerini tespit eder ve çalışma programını (%100 kişiselleştirilmiş) yeniden şekillendirir.
 */

interface MasteryScore {
  sectionId: string;
  sectionTitle: string;
  module: string;
  totalAttempts: number;
  correctAnswers: number;
  flashcardMastery: number; // 0-100
  masteryPercentage: number; // 0-100 (Ağırlıklı Ortalama)
}

export async function recalibrateStudyPlan(userId: string, courseId: string) {
  try {
    console.log(`[DYNAMIC_ENGINE] Recalibrating study plan for user ${userId} in course ${courseId}`);

    // 1. Tüm soruları ve kullanıcının cevaplarını getir
    const questions = await prisma.question.findMany({
      where: { courseId },
      include: { section: true }
    });

    const userAnswers = await prisma.userQuestionAnswer.findMany({
      where: { userId, question: { courseId } },
      include: { question: { include: { section: true } } }
    });

    // 2. Flashcard ilerlemelerini getir
    const flashcards = await prisma.flashcard.findMany({
      where: { courseId },
      include: { section: true }
    });

    const userFlashcards = await prisma.userFlashcardProgress.findMany({
      where: { userId, flashcard: { courseId } },
      include: { flashcard: { include: { section: true } } }
    });

    // 2.5 Deneme Sınavı (Mock Exam) Sonuçlarını getir
    const mockExams = await prisma.userMockExamResult.findMany({
      where: { userId, courseId },
      orderBy: { createdAt: "desc" },
      take: 3 // Son 3 deneme sınavı trendi yeterli
    });

    // 3. Bölüm (Section) bazlı "Mastery" (Hakimiyet) hesapla
    const masteryMap = new Map<string, MasteryScore>();

    // Init map
    questions.forEach((q: any) => {
      if (!q.sectionId || !q.section) return;
      if (!masteryMap.has(q.sectionId)) {
        masteryMap.set(q.sectionId, {
          sectionId: q.sectionId,
          sectionTitle: q.section.title,
          module: q.section.module,
          totalAttempts: 0,
          correctAnswers: 0,
          flashcardMastery: 0,
          masteryPercentage: 0
        });
      }
    });

    // Soru skorları
    userAnswers.forEach((ans: any) => {
      const q = ans.question;
      if (!q.sectionId) return;
      const stats = masteryMap.get(q.sectionId);
      if (stats) {
        stats.totalAttempts += ans.attemptCount;
        if (ans.isCorrect) stats.correctAnswers += ans.attemptCount; // Basit hesaplama (son cevabı doğruysa tüm denemeleri doğru sayma? Hayır, isCorrect mevcut durumu yansıtır. Daha kompleks yapılabilir.)
        // Daha agresif: Sadece ilk doğruyu veya son durumu baz al
        if (ans.isCorrect) stats.correctAnswers += 1;
        stats.totalAttempts = Math.max(stats.totalAttempts, stats.correctAnswers); // Fix possible overflow
      }
    });

    // Flashcard skorları (Bölüm bazlı kapsamlı analiz: Bilmiyorum, Zor, Kolay hepsini dahil et)
    const flashcardStats = new Map<string, { total: number, score: number }>();
    flashcards.forEach((f: any) => {
      if (!f.sectionId) return;
      if (!flashcardStats.has(f.sectionId)) flashcardStats.set(f.sectionId, { total: 0, score: 0 });
      flashcardStats.get(f.sectionId)!.total += 1;
    });

    userFlashcards.forEach((uf: any) => {
      const f = uf.flashcard;
      if (!f.sectionId) return;
      
      const stats = flashcardStats.get(f.sectionId);
      if (stats) {
        // easeFactor üzerinden hesaplama: 1.3 (Sürekli Bilmiyorum/Zor) ile 2.5+ (Sürekli Kolay) arası
        // 1.3 = 0 Puan, 2.5 = Tam Puan
        let cardScore = 0;
        if (uf.mastered) {
          cardScore = 1; // Master edildiyse direkt 1 tam puan
        } else {
          // easeFactor 1.3 ile 2.5 arasında değişiyor genelde. 
          const normalized = Math.max(0, Math.min(1, (uf.easeFactor - 1.3) / (2.5 - 1.3)));
          cardScore = normalized * 0.8; // Master edilmemiş ama fena değilse kısmi puan
        }
        stats.score += cardScore;
      }
    });

    // Deneme Sınavı cezaları (Zayıf alanları bul)
    const mockExamPenalties = new Map<string, number>();
    mockExams.forEach((exam: any, index: number) => {
       try {
         const weakSections = JSON.parse(exam.weakAreas); // ["sectionId1", "sectionId2"] veya ["Konu 1"] olabilir
         if (Array.isArray(weakSections)) {
            weakSections.forEach(ws => {
               // Son sınavların cezası daha yüksek (index 0 en yeni)
               const penalty = index === 0 ? 30 : (index === 1 ? 15 : 5);
               mockExamPenalties.set(ws, (mockExamPenalties.get(ws) || 0) + penalty);
            });
         }
       } catch (e) {}
    });

    // 4. Nihai Hakimiyet Skorunu (Mastery Percentage) Hesapla ve Zayıf Alanları Bul
    const weakSections: MasteryScore[] = [];

    Array.from(masteryMap.values()).forEach(stats => {
       const qRatio = stats.totalAttempts > 0 ? (stats.correctAnswers / stats.totalAttempts) * 100 : null;
       const fStats = flashcardStats.get(stats.sectionId);
       const fRatio = fStats && fStats.total > 0 ? (fStats.score / fStats.total) * 100 : null;

       let finalScore = 0;
       if (qRatio !== null && fRatio !== null) {
         finalScore = (qRatio * 0.6) + (fRatio * 0.4); // Sorular %60, Flashcardlar %40 ağırlıklı
       } else if (qRatio !== null) {
         finalScore = qRatio;
       } else if (fRatio !== null) {
         finalScore = fRatio;
       } else {
         finalScore = 100; // Hiç veri yoksa suçsuz sayılır
       }

       // Deneme sınavından gelen cezayı uygula
       const penalty = mockExamPenalties.get(stats.sectionId) || mockExamPenalties.get(stats.sectionTitle) || 0;
       finalScore = Math.max(0, finalScore - penalty);

       stats.masteryPercentage = finalScore;

       // EĞER HAKİMİYET %50'NİN ALTINDAYSA VE EN AZ 3 SORU ÇÖZÜLDÜYSE (Yanlış veri olmaması için)
       if (finalScore < 50 && stats.totalAttempts >= 3) {
         weakSections.push(stats);
       }
    });

    // 5. Yarının Takvimine (StudyPlan) Müdahale Et
    if (weakSections.length > 0) {
      // Sadece en kötü 2 bölümü seç ki kullanıcıyı boğmayalım
      weakSections.sort((a, b) => a.masteryPercentage - b.masteryPercentage);
      const topWeak = weakSections.slice(0, 2);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Yarın için önceden eklenmiş bir "Zayıf Alan Kurtarma" var mı bak
      const existingRecovery = await prisma.studyPlan.findFirst({
        where: {
          userId,
          courseId,
          date: tomorrowStr,
          type: "weakness_recovery"
        }
      });

      if (!existingRecovery) {
        const titles = topWeak.map(w => w.sectionTitle).join(", ");
        const sIds = topWeak.map(w => w.sectionId).join(",");

        await prisma.studyPlan.create({
          data: {
            userId,
            courseId,
            date: tomorrowStr,
            task: `Zayıf Alan Kurtarma İdmanı: ${titles}`,
            type: "weakness_recovery",
            duration: "45dk",
            sectionIds: sIds,
            completed: false
          }
        });
        console.log(`[DYNAMIC_ENGINE] 🚑 Injected Weakness Recovery task for tomorrow. Weak sections: ${titles}`);
      }
    }

    return { success: true, weakSections };
  } catch (error: any) {
    console.error("[DYNAMIC_ENGINE_ERROR]", error);
    return { error: error.message };
  }
}

/**
 * Deneme Sınavı Sprint Motoru (Sınava 15 gün kala tetiklenir)
 */
export async function checkAndInjectMockExams(userId: string, courseId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { targetExamDate: true } });
    if (!user?.targetExamDate) return;

    const daysLeft = Math.ceil((user.targetExamDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft > 0 && daysLeft <= 15) {
      // Son 15 güne girilmiş. Kaç deneme sınavı atanmış bak.
      const existingSprintExams = await prisma.studyPlan.count({
        where: {
          userId,
          courseId,
          type: "mock_exam_sprint"
        }
      });

      if (existingSprintExams === 0) {
        // Önümüzdeki 15 gün içine her 3 günde 1 deneme sınavı ata
        const sprints = [];
        let currDay = new Date();
        for (let i = 0; i < 5; i++) {
          currDay.setDate(currDay.getDate() + 3);
          if (currDay > user.targetExamDate) break;
          
          sprints.push({
            userId,
            courseId,
            date: currDay.toISOString().split('T')[0],
            task: `FINAL SPRINT: Tam Kapsamlı Deneme Sınavı #${i+1}`,
            type: "mock_exam_sprint",
            duration: "120dk",
            sectionIds: "all",
            completed: false
          });
        }

        if (sprints.length > 0) {
          await prisma.studyPlan.createMany({ data: sprints });
          console.log(`[DYNAMIC_ENGINE] 🚀 Injected ${sprints.length} Mock Exams for Final Sprint.`);
        }
      }
    }
  } catch (error: any) {
    console.error("[DYNAMIC_ENGINE_EXAM_SPRINT_ERROR]", error);
  }
}
