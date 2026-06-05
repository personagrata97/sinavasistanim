import { prisma } from '../src/lib/prisma'

async function main() {
  const section = await prisma.section.findFirst({
    where: { title: 'KISALTMALAR' }
  })

  if (!section || !section.notes) {
    console.log("Section not found or notes empty.")
    return
  }

  let cleanedNotes = section.notes
    // Remove lines starting with "- 💡" or just "💡"
    .replace(/^.*💡.*$\n?/gm, '')
    // Remove lines starting with "- 🎬" or just "🎬"
    .replace(/^.*🎬.*$\n?/gm, '')
    // Remove lines starting with "- **Mikro-Senaryo" or "- **Benzetme"
    .replace(/^.*-\s*\*\*(Mikro-Senaryo|Benzetme).*$\n?/gm, '')
    // Remove multiple empty lines
    .replace(/\n{3,}/g, '\n\n')

  // Replace the bad introduction paragraph
  cleanedNotes = cleanedNotes.replace(
    /### 🎯 Bu Bölüm Ne Anlatıyor\?[\s\S]*?(?=\n\s*\*)/i,
    "### 🎯 Bu Bölüm Ne Anlatıyor?\nBu bölüm, bilgi sistemleri ve siber güvenlik alanında sıkça karşılaşılan kritik kısaltmaları ve bunların açılımlarını sunmaktadır.\n"
  )

  await prisma.section.update({
    where: { id: section.id },
    data: { notes: cleanedNotes }
  })

  console.log("Successfully cleaned excess text from KISALTMALAR.")
}

main().catch(console.error).finally(() => prisma.$disconnect())
