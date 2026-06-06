import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.section.findMany().then(sections => {
  console.log(sections.map(s => s.title));
});
