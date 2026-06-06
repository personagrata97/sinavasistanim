import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const section = await prisma.section.findFirst({
    where: { title: 'Kısaltmalar' }
  });
  if (section) {
    require('fs').writeFileSync('scratch/kisaltmalar_raw.md', section.notes || '');
    console.log("Saved to scratch/kisaltmalar_raw.md");
  }
}
main();
