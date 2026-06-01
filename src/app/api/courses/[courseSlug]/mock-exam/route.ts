import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseSlug: string }> }
) {
  try {
    const { courseSlug } = await params
    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
      include: {
        blueprint: {
          include: { modules: true }
        },
        program: true
      }
    })

    if (!course) {
      return NextResponse.json({ error: "Eğitim bulunamadı" }, { status: 404 })
    }

    if (!course.blueprint) {
      // Şablon yoksa eski usül rastgele 25 soru çek (SPL standardı)
      const isMasak = course.program?.slug === "masak"
      const takeCount = isMasak ? 50 : 25
      const randomQuestions = await prisma.question.findMany({
        where: { courseId: course.id, reported: false },
        take: takeCount,
        orderBy: { id: 'asc' }, // Gerçekte rastgele olması için raw query gerekebilir
        include: { section: { select: { title: true } } }
      })
      const parsedRandomQuestions = randomQuestions.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
      }))
      return NextResponse.json({ questions: parsedRandomQuestions, isBlueprint: false })
    }

    // Şablon varsa, modüllere göre tam ağırlıkta soru çek
    let finalExamQuestions: any[] = []
    
    for (const module of course.blueprint.modules) {
      // Modüle ait istenen sayıda soru çek
      const moduleQuestions = await prisma.question.findMany({
        where: { 
          courseId: course.id, 
          module: module.moduleName,
          reported: false
        },
        take: module.questionCount,
        orderBy: { id: 'desc' }, // Gerçekte rastgele çekilecek
        include: { section: { select: { title: true } } }
      })
      
      finalExamQuestions = [...finalExamQuestions, ...moduleQuestions]
    }

    // Soruları karıştır (Shuffle)
    finalExamQuestions.sort(() => Math.random() - 0.5)

    const parsedFinalQuestions = finalExamQuestions.map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    }))

    return NextResponse.json({
      totalQuestions: course.blueprint.totalQuestions || (course.program?.slug === "masak" ? 50 : 25),
      passingScore: course.blueprint.passingScore || (course.program?.slug === "masak" ? 65 : 60),
      questions: parsedFinalQuestions,
      isBlueprint: true
    })

  } catch (error) {
    console.error("[MOCK_EXAM_API] Error:", error)
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 })
  }
}
