import { PrismaClient } from '@prisma/client';
import { processCourseInBackground } from '../src/lib/pdf-processor';

const prisma = new PrismaClient();

async function run() {
  const course = await prisma.course.findUnique({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' }
  });
  
  if (course) {
    console.log("Forcing background process trigger...");
    await processCourseInBackground(course.id);
    console.log("Triggered!");
  }
}

run();
