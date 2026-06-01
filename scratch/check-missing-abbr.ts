import { prisma } from "../src/lib/prisma"

// We'll read the NotesTab.tsx file to get the existing ABBREVIATIONS_DICT keys
import * as fs from "fs"
import * as path from "path"

async function run() {
  const notesTabPath = path.resolve(process.cwd(), "src/components/course/NotesTab.tsx")
  const fileContent = fs.readFileSync(notesTabPath, "utf-8")

  // Extract the keys from the ABBREVIATIONS_DICT in NotesTab.tsx using regex
  const dictMatch = fileContent.match(/const ABBREVIATIONS_DICT: Record<string, string> = {([\s\S]*?)}/)
  if (!dictMatch) {
    console.error("Could not find ABBREVIATIONS_DICT in NotesTab.tsx")
    return
  }

  const existingKeys = new Set<string>()
  const lineRegex = /"([^"]+)"\s*:/g
  let match
  while ((match = lineRegex.exec(dictMatch[1])) !== null) {
    existingKeys.add(match[1])
  }

  console.log(`Loaded ${existingKeys.size} keys from ABBREVIATIONS_DICT.\n`)

  // Now query Section 1 notes from DB
  const s = await prisma.section.findFirst({
    where: { 
      course: { slug: "bd-bilgi-sistemleri-guvenligi" },
      order: 1
    }
  })

  if (!s || !s.notes) {
    console.log("Section 1 notes not found in database!")
    return
  }

  // Find all headings of type "### 🔑 [Abbreviation]"
  const headings = s.notes.match(/### 🔑\s*(.*?)(?:\s*\(.*?\))?\s*$/gm) || []
  const foundAbbreviations: string[] = []

  headings.forEach(h => {
    // Extract the abbreviation
    const m = h.match(/### 🔑\s*(.*?)(?:\s*\(.*?\))?\s*$/)
    if (m) {
      const fullTerm = m[1].trim()
      // Extract acronym if in format "ACRONYM (Full Name)" or just "ACRONYM"
      const cleanTerm = fullTerm.split(" ")[0].replace(/[^a-zA-Z0-9-]/g, "")
      foundAbbreviations.push(cleanTerm)
    }
  })

  console.log(`Found ${foundAbbreviations.length} abbreviations in Section 1 notes:`)
  const missing: string[] = []
  foundAbbreviations.forEach(abbr => {
    if (!existingKeys.has(abbr) && abbr.length > 1) {
      missing.push(abbr)
    }
  })

  if (missing.length > 0) {
    console.log(`\n❌ Missing abbreviations in ABBREVIATIONS_DICT (${missing.length}):`)
    missing.forEach(m => console.log(`- ${m}`))
  } else {
    console.log("\n✅ All abbreviations are fully covered in ABBREVIATIONS_DICT!")
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
