import { prisma } from "../src/lib/prisma"

async function run() {
  const courses = await prisma.course.findMany({
    select: {
      name: true,
      slug: true,
      examDate: true
    }
  })

  console.log("=== COURSE EXAM DATES IN DB ===")
  courses.forEach(c => {
    console.log(`Course: ${c.name} (${c.slug}) | Exam Date: ${c.examDate}`)
  })
}

run().catch(console.error).finally(() => prisma.$disconnect())
