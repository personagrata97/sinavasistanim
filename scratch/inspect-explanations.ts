import { prisma } from "../src/lib/prisma"

async function run() {
  const course = await prisma.course.findUnique({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" }
  })
  if (!course) {
    console.log("Course not found!")
    return
  }

  const questions = await prisma.question.findMany({
    where: { courseId: course.id }
  })

  console.log("=== INSPECTING QUESTION EXPLANATIONS ===")
  questions.forEach((q, i) => {
    console.log(`\nQuestion ${i + 1}:`)
    console.log(`ID: ${q.id}`)
    console.log(`Text: ${q.text.substring(0, 100)}...`)
    console.log(`Explanation (JSON.stringify):`)
    console.log(JSON.stringify(q.explanation))
  })
}

run().catch(console.error).finally(() => prisma.$disconnect())
