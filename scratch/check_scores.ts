import prisma from './src/lib/prisma';

async function main() {
  const sections = await prisma.section.findMany({ 
    where: { course: { slug: 'bd-bilgi-sistemleri-isletimi' }, processed: true },
    orderBy: { order: 'asc' }
  });
  
  for (const sec of sections) {
    console.log(`\n==================================`);
    console.log(`Section: ${sec.title}`);
    console.log(`Score: ${sec.qualityScore}`);
    console.log(`Verification Logs:\n${sec.verificationLogs?.substring(0, 500)}...`);
  }
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
