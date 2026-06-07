import { prisma } from '../src/lib/prisma'

async function main() {
  const course = await prisma.course.findUnique({
    where: { slug: 'bd-bilgi-sistemleri-guvenligi' },
    include: { sections: { orderBy: { order: 'asc' } } }
  })
  
  if (!course) return;
  const s3 = course.sections[3]; // 3. Fiziksel ve Çevresel Güvenlik
  const notes = s3.notes || "";
  
  // Extract mermaid code
  const matches = [...notes.matchAll(/```mermaid\n([\s\S]*?)```/g)];
  if (matches.length > 0) {
    console.log(`Found ${matches.length} diagrams.`);
    matches.forEach((m, i) => {
      console.log(`\n--- DIAGRAM ${i+1} ---`);
      console.log(m[1]);
    })
  } else {
    console.log("No mermaid diagrams found in notes.");
  }
}
main()
