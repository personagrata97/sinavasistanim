import { prisma } from '../src/lib/prisma';
async function main() {
  const sections = await prisma.section.findMany({
    where: { course: { slug: 'bd-bilgi-sistemleri-guvenligi' } },
    select: { title: true, verificationIssues: true }
  });
  for (const s of sections) {
    if (s.verificationIssues) {
      try {
        const issues = JSON.parse(s.verificationIssues);
        if (issues.currentMicroPhase) {
          console.log(s.title, "->", issues.currentMicroPhase);
        }
      } catch(e) {}
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
