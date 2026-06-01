import { PrismaClient } from '@prisma/client'

// Instantiate directly with URL to avoid the Next.js specific wrapper issue
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "file:../prisma/dev.db"
    }
  }
})

async function main() {
  const course = await prisma.course.findFirst({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" },
    include: { sections: { orderBy: { order: "asc" } } }
  })
  
  if (!course) {
    console.log("Course not found")
    return
  }
  
  // "Not 2" is likely the 2nd section. 
  // Let's find section at index 1
  const section2 = course.sections[1]
  if (!section2) {
    console.log("Section 2 not found")
    return
  }
  
  console.log(`Resetting Section 2: ${section2.title} (Score: ${section2.verificationScore})`)
  
  // Clear the notes and score to force a fresh regeneration
  await prisma.section.update({
    where: { id: section2.id },
    data: {
      notes: null,
      verificationScore: null,
      verificationIssues: null
    }
  })
  
  // Set course status back to processing so the background processor can pick it up
  await prisma.course.update({
    where: { id: course.id },
    data: { status: "processing" }
  })
  
  console.log("Successfully reset Section 2 and set course to processing.")
}

main()
