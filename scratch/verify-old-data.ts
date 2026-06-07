import { prisma } from '../src/lib/prisma'

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' },
    include: { sections: { orderBy: { order: 'asc' } } }
  })
  
  if (!course) return;
  const s1 = course.sections[1]; // 1. Bilgi Güvenliği Yönetimi
  
  console.log(`--- SECTION: ${s1.title} ---`);
  
  const qStr = s1.generatedQuestions;
  if (qStr) {
    try {
      const qs = JSON.parse(qStr);
      console.log(`QUESTIONS COUNT: ${qs.length}`);
      if (qs.length > 0) {
         console.log("FIRST QUESTION SAMPLE:");
         console.log(JSON.stringify(qs[0], null, 2));
      }
    } catch(e) { console.log("JSON PARSE ERROR IN QUESTIONS"); }
  } else {
    console.log("NO QUESTIONS FOUND!");
  }
}
main()
