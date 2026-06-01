import { prisma } from "../src/lib/prisma"

async function run() {
  console.log("🔄 Resetting Section 1 and Section 2 scores and notes in dev.db...")
  
  // Section 1
  const sec1 = await prisma.section.findFirst({
    where: {
      course: { slug: "masak-uyum-gorevlisi" },
      order: 1
    }
  })
  
  if (sec1) {
    await prisma.section.update({
      where: { id: sec1.id },
      data: {
        verificationScore: 0,
        notes: null,
        processed: false,
        verificationIssues: null
      }
    })
    console.log("✅ Section 1 has been reset successfully.")
  } else {
    console.log("❌ Section 1 not found.")
  }

  // Section 2
  const sec2 = await prisma.section.findFirst({
    where: {
      course: { slug: "masak-uyum-gorevlisi" },
      order: 2
    }
  })
  
  if (sec2) {
    await prisma.section.update({
      where: { id: sec2.id },
      data: {
        verificationScore: 0,
        notes: null,
        processed: false,
        verificationIssues: null
      }
    })
    console.log("✅ Section 2 has been reset successfully.")
  } else {
    console.log("❌ Section 2 not found.")
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
