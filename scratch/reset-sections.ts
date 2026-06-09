import { prisma } from '../src/lib/prisma';

async function main() {
  await prisma.section.updateMany({
    where: { 
      course: { slug: 'bd-bilgi-sistemleri-guvenligi' },
      title: { in: ['3. Fiziksel ve Çevresel Güvenlik', '4. Ağ Güvenliği'] }
    },
    data: { processed: false }
  });
  console.log("Sections 3 and 4 reset to processed=false");
}

main().catch(console.error).finally(() => prisma.$disconnect());
