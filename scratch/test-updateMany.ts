import { prisma } from '../src/lib/prisma';
async function main() {
  try {
    await prisma.section.updateMany({
      where: { processed: false },
      data: { createdAt: new Date() }
    });
    console.log("SUCCESS");
  } catch (e) {
    console.error("ERROR:", e);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
