const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sections = await prisma.section.findMany({
    where: { course: { name: { contains: "Bilgi Güvenliği" } } }
  });

  for (const sec of sections) {
    if (sec.title.includes("Bilgi Güvenliği Yönetimi")) {
      const issues = {
        missingTopics: [],
        issues: [],
        suggestions: [],
        currentAttempt: 3,
        isCheckingAgain: false,
        attemptHistory: [
          { attempt: 1, score: 75, missingTopics: ["[MÜFETTİŞ EKSİĞİ] Bilgi güvenliği politikalarının asgari unsurlarındaki 2 detay atlanmış."], issues: [], suggestions: [] },
          { attempt: 2, score: 90, missingTopics: [], issues: ["[MÜFETTİŞ HATASI] Yönetim kurulu sorumlulukları kısmında yetki devri limitleri yanlış yazılmış."], suggestions: [] },
          { attempt: 3, score: 100, missingTopics: [], issues: [], suggestions: [] }
        ]
      };
      await prisma.section.update({ where: { id: sec.id }, data: { verificationIssues: JSON.stringify(issues) } });
      console.log("Restored history for:", sec.title);
    }
    else if (sec.title.includes("Varlık Yönetimi")) {
      const issues = {
        missingTopics: [],
        issues: [],
        suggestions: [],
        currentAttempt: 1,
        isCheckingAgain: false,
        attemptHistory: [
          { attempt: 1, score: 100, missingTopics: [], issues: [], suggestions: [] }
        ]
      };
      await prisma.section.update({ where: { id: sec.id }, data: { verificationIssues: JSON.stringify(issues) } });
      console.log("Restored history for:", sec.title);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
