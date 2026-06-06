import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const currentSection = await prisma.section.findFirst({
    where: { title: { contains: "Ağ Güvenliği" } }
  });
  const rawSection: any[] = await prisma.$queryRaw`SELECT updatedAt FROM Section WHERE id = ${currentSection?.id}`;
  console.log("Raw updatedAt:", rawSection[0].updatedAt);
  console.log("Type:", typeof rawSection[0].updatedAt);
  console.log("Time:", new Date(rawSection[0].updatedAt).getTime());
  console.log("Date.now:", Date.now());
}
main();
