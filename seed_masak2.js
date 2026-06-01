const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const MASAK_COURSES = [
  {
    name: "Hukuki Çerçeve (Teorik Bilgi)",
    slug: "hukuki-cerceve",
    order: 1,
    description: "5549 ve 6415 sayılı Kanunlar, MASAK yapısı ve uluslararası standartlar (FATF)."
  },
  {
    name: "Uyum Yönetimi (Uygulama Yetkinliği)",
    slug: "uyum-yonetimi",
    order: 2,
    description: "Müşterinin Tanınması (KYC), Şüpheli İşlem Bildirimi (ŞİB) ve Risk Yönetimi."
  }
]

async function main() {
  const masakProgram = await prisma.program.findUnique({ where: { slug: "masak" } })
  if (masakProgram) {
    for (const course of MASAK_COURSES) {
      const existing = await prisma.course.findUnique({ where: { slug: course.slug } })
      if (!existing) {
        await prisma.course.create({
          data: {
            name: course.name,
            slug: course.slug,
            order: course.order,
            description: course.description,
            programId: masakProgram.id
          }
        })
      } else if (!existing.programId) {
        await prisma.course.update({
          where: { id: existing.id },
          data: { programId: masakProgram.id }
        })
      }
    }
    console.log("MASAK courses seeded successfully.")
  } else {
    console.log("MASAK program not found.")
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
