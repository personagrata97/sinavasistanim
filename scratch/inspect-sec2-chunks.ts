import { prisma } from "../src/lib/prisma"

async function run() {
  const section = await prisma.section.findFirst({
    where: {
      course: { slug: "bd-bilgi-sistemleri-guvenligi" },
      order: 2
    }
  })

  if (!section || !section.notes) {
    console.log("Section 2 notes not found!")
    return
  }

  console.log("=== DETAIL ANALYSIS ===")
  const notes = section.notes
  console.log(`Total chars: ${notes.length}`)
  
  // Let's divide notes into chunks of 1000 characters and print their start
  for (let i = 0; i < notes.length; i += 1000) {
    console.log(`\n--- Chunk starting at ${i} ---`)
    console.log(notes.substring(i, i + 200).replace(/\n/g, ' \\n '))
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
