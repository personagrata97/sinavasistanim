const { prisma } = require("./src/lib/prisma")
const fs = require("fs")
const { extractAllText } = require("./src/lib/pdf-engine")

async function run() {
  const course = await prisma.course.findFirst({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" }
  })

  if (!course || !course.pdfPath) {
    console.log("PDF not found!")
    return
  }

  const pdfBuffer = fs.readFileSync(course.pdfPath)
  const pageTexts = await extractAllText(pdfBuffer)

  console.log(`PDF has total ${pageTexts.length} pages.`)
  
  for (let i = 1; i <= 15; i++) {
    const text = pageTexts[i - 1] || ""
    console.log(`\n=================== PHYSICAL PAGE ${i} (Length: ${text.length}) ===================`)
    console.log(text.substring(0, 1000))
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
