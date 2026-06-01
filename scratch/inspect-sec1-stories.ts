import { prisma } from "../src/lib/prisma"

async function run() {
  const s = await prisma.section.findFirst({
    where: {
      course: { slug: "masak-uyum-gorevlisi" },
      order: 1
    }
  })
  if (!s || !s.notes) {
    console.log("Section 1 not found or notes empty")
    return
  }

  console.log(`=== Section 1 Notes Length: ${s.notes.length} characters ===`)
  
  // Find all paragraphs containing Senaryo or Mikro-Senaryo
  const lines = s.notes.split("\n")
  let inStory = false
  let currentStory = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.includes("🎬") || line.toLowerCase().includes("senaryo") || line.toLowerCase().includes("örnek olay")) {
      console.log(`\nLine ${i + 1}: ${line}`)
      inStory = true
      currentStory = [line]
    } else if (inStory) {
      if (line.trim() === "" || line.startsWith("*") || line.startsWith("#") || line.startsWith("---")) {
        inStory = false
      } else {
        console.log(`Line ${i + 1} (cont): ${line}`)
      }
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
