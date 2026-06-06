import { prisma } from '../src/lib/prisma';

async function main() {
  const course = await prisma.course.update({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' },
    data: { status: 'idle' }
  });
  console.log("Status set to idle!");
}
main().catch(console.error);
