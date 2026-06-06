const fs = require('fs');

let content = fs.readFileSync('src/lib/actions.ts', 'utf8');

// replace generateMoreQuestionsAction with generateMoreContentAction
content = content.replace(
  /export async function generateMoreQuestionsAction\(courseSlug: string, sectionId\?: string, count: number = 20\) \{[\s\S]*?return \{ success: true, message: `\$\{totalGenerated\} yeni soru üretildi!`, count: totalGenerated \}\n  \} catch \(error: any\) \{\n    console\.error\("\[generateMoreQuestions\]", error\)\n    return \{ success: false, message: error\.message \|\| "Soru üretme başarısız\." \}\n  \}\n\}/,
  `export async function generateMoreContentAction(courseSlug: string, contentType: "QUESTIONS" | "FLASHCARDS", sectionId?: string, count: number = 20) {
  try {
    const auth = await requireAdmin()
    if (!auth.authorized) return { success: false, message: auth.error || "Bu işlem için yetkiniz yok." }

    const course = await prisma.course.findUnique({ 
      where: { slug: courseSlug },
      include: { program: true, sections: true }
    })
    if (!course) throw new Error("Ders bulunamadı")
    
    const { generateQuestions, generateFlashcards } = await import("./ai-service")
    
    const targetSections = sectionId 
      ? course.sections.filter(s => s.id === sectionId)
      : course.sections.filter(s => s.rawContent && s.rawContent.length > 100)
    
    if (targetSections.length === 0) return { success: false, message: "İşlenecek bölüm bulunamadı." }
    
    let totalGenerated = 0
    const aiMode = course.program?.aiMode || "general"

    if (contentType === "QUESTIONS") {
      const existingItems = await prisma.question.findMany({ where: { courseId: course.id }, select: { text: true } })
      const existingTexts = new Set(existingItems.map(eq => eq.text.trim().toLowerCase()))
      
      for (const section of targetSections) {
        if (totalGenerated >= count) break
        const remaining = count - totalGenerated
        const questions = await generateQuestions(section.rawContent, section.title, course.name, course.userLevel, aiMode, course.geminiFileUri || undefined, section.pageStart, section.pageEnd, section.importance || undefined)
        
        for (const q of questions.slice(0, remaining)) {
          try {
            const textLower = q.text.trim().toLowerCase()
            if (!existingTexts.has(textLower)) {
              await prisma.question.create({
                data: { courseId: course.id, sectionId: section.id, text: q.text, options: JSON.stringify(q.options), correct: q.correct, explanation: q.explanation, difficulty: q.difficulty || "medium" }
              })
              existingTexts.add(textLower)
              totalGenerated++
            }
          } catch {}
        }
      }
    } else {
      const existingItems = await prisma.flashcard.findMany({ where: { courseId: course.id }, select: { front: true } })
      const existingTexts = new Set(existingItems.map(eq => eq.front.trim().toLowerCase()))
      
      for (const section of targetSections) {
        if (totalGenerated >= count) break
        const remaining = count - totalGenerated
        const cards = await generateFlashcards(section.rawContent, section.title, course.name, course.userLevel, aiMode, course.geminiFileUri || undefined, section.pageStart, section.pageEnd, section.importance || undefined)
        
        for (const c of cards.slice(0, remaining)) {
          try {
            const textLower = c.front.trim().toLowerCase()
            if (!existingTexts.has(textLower)) {
              await prisma.flashcard.create({
                data: { courseId: course.id, sectionId: section.id, front: c.front, back: c.back, difficulty: c.difficulty || "medium" }
              })
              existingTexts.add(textLower)
              totalGenerated++
            }
          } catch {}
        }
      }
    }
    
    return { success: true, message: \`\${totalGenerated} yeni \${contentType === 'QUESTIONS' ? 'soru' : 'kart'} üretildi!\`, count: totalGenerated }
  } catch (error: any) {
    console.error("[generateMoreContentAction]", error)
    return { success: false, message: error.message || "Üretim başarısız." }
  }
}`
);

fs.writeFileSync('src/lib/actions.ts', content);
console.log("actions.ts updated successfully");
