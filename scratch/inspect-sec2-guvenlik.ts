import { prisma } from "../src/lib/prisma"

async function run() {
  const section = await prisma.section.findFirst({
    where: {
      course: { slug: "bd-bilgi-sistemleri-guvenligi" },
      order: 2
    }
  })

  if (!section) {
    console.log("Section 2 not found!")
    return
  }

  console.log("=== INSPECTING SECTION 2 NOTES ===")
  console.log(`ID: ${section.id}`)
  console.log(`Title: ${section.title}`)
  console.log(`Verification Score: ${section.verificationScore}%`)
  console.log(`Notes Length: ${section.notes ? section.notes.length : 0} characters`)
  
  if (section.notes) {
    console.log("\n--- FIRST 500 CHARACTERS ---")
    console.log(section.notes.substring(0, 500))
    console.log("\n--- LAST 500 CHARACTERS ---")
    console.log(section.notes.substring(section.notes.length - 500))
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
