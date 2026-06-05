import { PrismaClient } from '@prisma/client';
process.env.DATABASE_URL = "file:../prisma/dev.db";
const prisma = new PrismaClient();
async function main() {
  const sections = await prisma.section.findMany({
    where: { order: 1 },
    select: { title: true, verificationScore: true, verificationIssues: true }
  });
  console.log(JSON.stringify(sections, null, 2));
}
main();
