import prisma from './src/lib/prisma';

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: 'bd-bilgi-sistemleri-isletimi' } });
  if (!course) return console.log("Course not found");
  
  const sections = await prisma.section.findMany({ where: { courseId: course.id }, orderBy: { order: 'asc' } });
  if (sections.length === 0) return console.log("No sections found");
  
  const sec1 = sections[0]; // Bölüm 1
  console.log("Section Title:", sec1.title);
  
  const notes = sec1.notes || "";
  const summaryIndex = notes.indexOf("### 🔑 Bölüm Özeti");
  
  if (summaryIndex !== -1) {
     const endIndex = notes.indexOf("### 🧪 Kendini Test Et!", summaryIndex);
     let newNotes = "";
     if (endIndex !== -1) {
         newNotes = notes.substring(0, summaryIndex) + notes.substring(endIndex);
     } else {
         newNotes = notes.substring(0, summaryIndex);
     }
     
     await prisma.section.update({
        where: { id: sec1.id },
        data: { notes: newNotes }
     });
     console.log("SUCCESS: Bölüm Özeti successfully removed from DB!");
  } else {
     console.log("Summary not found in notes.");
  }
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
