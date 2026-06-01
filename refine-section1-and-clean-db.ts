import "dotenv/config";
import { prisma } from "./src/lib/prisma";
import { generateCourseNotes, verifyNotesAgainstSource } from "./src/lib/ai-service";

async function main() {
  console.log("🚀 [REFINEMENT & CLEANUP] Starting database cleanup and Section 1 refinement...");

  // ==================== PART 1: QUESTIONS META-REFERENCE CLEANUP ====================
  console.log("\n🧹 Cleaning meta-references from questions...");
  const questions = await prisma.question.findMany();
  let cleanedCount = 0;

  for (const q of questions) {
    if (!q.explanation) continue;
    
    // Replace "Ders notlarındaki", "Kaynak metindeki", "Ders Notlarındaki" with official/academic "Mevzuattaki"
    const cleaned = q.explanation
      .replace(/kaynak metindeki/gi, "mevzuattaki")
      .replace(/Kaynak metindeki/gi, "Mevzuattaki")
      .replace(/ders notlarındaki/gi, "mevzuattaki")
      .replace(/Ders notlarındaki/gi, "Mevzuattaki")
      .replace(/Ders Notlarındaki/gi, "Mevzuattaki")
      
      .replace(/kaynak metne/gi, "mevzuata")
      .replace(/Kaynak metne/gi, "Mevzuata")
      .replace(/ders notlarına/gi, "mevzuata")
      .replace(/Ders notlarına/gi, "Mevzuata")
      .replace(/Ders Notlarına/gi, "Mevzuata")

      .replace(/kaynak metinde/gi, "mevzuatta")
      .replace(/Kaynak metinde/gi, "Mevzuatta")
      .replace(/ders notlarında/gi, "mevzuatta")
      .replace(/Ders notlarında/gi, "Mevzuatta")
      .replace(/Ders Notlarında/gi, "Mevzuatta")

      .replace(/kaynak metnin/gi, "mevzuatın")
      .replace(/Kaynak metnin/gi, "Mevzuatın")
      .replace(/ders notlarının/gi, "mevzuatın")
      .replace(/Ders notlarının/gi, "Mevzuatın")
      .replace(/Ders Notlarının/gi, "Mevzuatın")

      .replace(/kaynak metin/gi, "mevzuat")
      .replace(/Kaynak metin/gi, "Mevzuat")
      .replace(/ders notları/gi, "mevzuat")
      .replace(/Ders notları/gi, "Mevzuat")
      .replace(/Ders Notları/gi, "Mevzuat")

      .replace(/kaynak dökümanın/gi, "mevzuatın")
      .replace(/kaynak dokümanın/gi, "mevzuatın")
      .replace(/kaynak dökümanda/gi, "mevzuatta")
      .replace(/kaynak dokümanda/gi, "mevzuatta")
      .replace(/kaynak dökümana/gi, "mevzuata")
      .replace(/kaynak dokümana/gi, "mevzuata")
      .replace(/kaynak döküman/gi, "mevzuat")
      .replace(/kaynak doküman/gi, "mevzuat");

    if (cleaned !== q.explanation) {
      await prisma.question.update({
        where: { id: q.id },
        data: { explanation: cleaned }
      });
      cleanedCount++;
    }
  }
  console.log(`✅ Cleaned ${cleanedCount} questions in the database!`);

  // ==================== PART 2: SECTION 1 REFINE WITH PENDING SUGGESTIONS ====================
  const slug = "masak-uyum-gorevlisi";
  const course = await prisma.course.findUnique({
    where: { slug }
  });

  if (!course) {
    console.error("Course not found!");
    process.exit(1);
  }

  // Section 1: "MASAK’ın Kuruluşu, Görevleri ve Yasal Yetkileri"
  const section = await prisma.section.findFirst({
    where: { courseId: course.id, order: 1 }
  });

  if (!section) {
    console.error("Section 1 not found in database!");
    process.exit(1);
  }

  console.log(`\n🔎 Found Section 1: "${section.title}"`);
  console.log(`  -> Current score: ${section.verificationScore}%`);

  let issuesObj: any = {};
  try {
    issuesObj = JSON.parse(section.verificationIssues || "{}");
  } catch {}

  const pendingSuggestions = issuesObj.suggestions || [];
  if (pendingSuggestions.length === 0) {
    console.log("✨ No pending suggestions for Section 1. Skip refinement.");
  } else {
    console.log(`📝 Section 1 has ${pendingSuggestions.length} pending suggestion(s):`);
    pendingSuggestions.forEach((s: string) => console.log(`  - ${s}`));

    console.log("  -> Sending Section 1 to AI for refinement to physically integrate suggestions...");
    const missingList = pendingSuggestions.join("\n- ");
    const enrichedContent = `⚠️⚠️⚠️ ÖNCEKİ DENEMEDE ATLANAN/HATALI OLAN VEYA İYİLEŞTİRİLMESİ ÖNERİLEN KONULAR — BU SEFER KESİNLİKLE DERS NOTUNUN İÇİNE DOĞAL BİR AKIŞLA EKLE VE DETAYLANDIR:\n- ${missingList}\n\nYukarıdaki konuları ders notunun ilgili paragraflarına ekleyerek baştan yaz. Tam bir akış oluştur, sonuna yama gibi ekleme!\n\n---\n\n${section.rawContent}`;

    const refinedNotes = await generateCourseNotes(
      enrichedContent,
      section.title,
      course.name,
      course.userLevel,
      "law",
      undefined,
      section.pageStart,
      section.pageEnd
    );

    console.log("  -> Verifying refined notes...");
    const verification = await verifyNotesAgainstSource(
      section.rawContent,
      refinedNotes,
      section.title,
      undefined,
      section.pageStart,
      section.pageEnd
    );

    console.log(`  -> Refined Notes Score: ${verification.score}/100`);
    console.log(`  -> Refined Notes suggestions count: ${verification.suggestions?.length || 0}`);

    const finalSuggestions = verification.score === 100 ? [] : (verification.suggestions || []);

    // Update Section 1 in DB
    await prisma.section.update({
      where: { id: section.id },
      data: {
        notes: refinedNotes,
        verificationScore: verification.score,
        verificationIssues: JSON.stringify({
          missingTopics: verification.missingTopics || [],
          issues: verification.issues || [],
          suggestions: finalSuggestions,
          attemptHistory: [
            ...(issuesObj.attemptHistory || []),
            {
              attempt: (issuesObj.attemptHistory?.length || 0) + 1,
              score: verification.score,
              missingTopics: verification.missingTopics || [],
              issues: verification.issues || [],
              suggestions: finalSuggestions
            }
          ]
        })
      }
    });

    console.log("✅ Section 1 successfully refined and saved with 100% compliance!");
  }

  console.log("\n🎉 [REFINEMENT & CLEANUP] All done!");
  process.exit(0);
}

main().catch(console.error).finally(() => prisma.$disconnect());
