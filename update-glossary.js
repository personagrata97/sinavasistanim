const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  const content = fs.readFileSync('src/lib/abbreviations.ts', 'utf-8');
  const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
  const dict = JSON.parse(jsonStr);
  
  await prisma.course.update({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' },
    data: {
      glossary: JSON.stringify(dict)
    }
  });
  console.log("Glossary updated successfully via JS!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
