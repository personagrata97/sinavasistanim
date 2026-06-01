// Bölüm 1 için manuel patch scripti
const { PrismaClient } = require("@prisma/client")

async function patchSection1() {
  const prisma = new PrismaClient()
  
  try {
    const section = await prisma.section.findFirst({
      where: { title: { contains: "MASAK Yetkileri" } },
      include: { course: true }
    })
    
    if (!section) {
      console.log("❌ Bölüm bulunamadı")
      return
    }
    
    console.log(`📌 Bölüm: ${section.title} (Skor: ${section.verificationScore})`)
    
    const issues = JSON.parse(section.verificationIssues || "{}")
    const missingTopics = issues.missingTopics || []
    
    if (missingTopics.length === 0) {
      console.log("✅ Eksik konu yok")
      return
    }
    
    console.log(`📋 ${missingTopics.length} eksik konu:`)
    missingTopics.forEach((t, i) => console.log(`  ${i + 1}. ${t}`))
    
    // patchMissingTopics ve generatePatchExtras fonksiyonlarını import et
    // Bunun yerine doğrudan HTTP call yapıyoruz
    const patchText = `

### 📌 Ek Bilgiler

#### 🔑 Denetim Elemanı Görevlendirme Usulü

🎬 **Hikaye:** Denetçi Zeynep Hanım, bir bankayı incelemek istiyor. Ama tek başına karar veremez!

Süreç şöyle işler:
1. **MASAK Başkanı** talep eder
2. **İlgili birim amiri** teklif sunar  
3. **Bağlı/ilgili Bakan** onay verir

⚠️ **Sınav Tuzağı:** Denetim elemanını doğrudan Başkan görevlendiremez — Bakan onayı **ZORUNLUDUR!**

#### 🔑 Uluslararası Mutabakat Muhtıraları (MoU)

📌 MoU = Ülkeler arası bilgi paylaşım anlaşması

| Aşama | Yetkili |
|-------|---------|
| **İmzalama** | MASAK Başkanı |
| **Yürürlüğe Girme** | Cumhurbaşkanı Kararı |

🎬 **Hikaye:** MASAK Başkanı ABD'nin FinCEN kurumu ile MoU imzaladı. Ama bu anlaşma hemen yürürlüğe girmez — **Cumhurbaşkanı kararı** gerekir!

#### 🔑 Yabancı Ülke Denetimi — Karşılıklılık İlkesi

Yabancı ülke mercileri, Türkiye'deki yükümlüler nezdinde denetim yapabilir mi?

✅ **Evet** — ama şartı var: **Karşılıklılık İlkesi** (Reciprocity)

💡 *Yani: \"Sen benim ülkemde denetim yapabilirsin, ben de senin ülkende yapabileyim\" anlaşması olmalı.*

⚠️ Karşılıklılık sağlanmadan yabancı ülke denetim yapamaz!
`
    
    // Nota ekle
    const updatedNotes = section.notes + patchText
    
    await prisma.section.update({
      where: { id: section.id },
      data: { notes: updatedNotes }
    })
    console.log(`✅ Not güncellendi (+${patchText.length} char)`)
    
    // Ek flashcardlar
    const flashcards = [
      { front: "MASAK bünyesinde denetim elemanlarını görevlendirme süreci nasıl işler?", back: "1) MASAK Başkanı talep eder, 2) İlgili birim amiri teklif sunar, 3) Bağlı/ilgili Bakan onay verir. Bakan onayı olmadan görevlendirme yapılamaz!", difficulty: "hard" },
      { front: "Uluslararası Mutabakat Muhtıralarını (MoU) imzalama yetkisi kimdedir ve nasıl yürürlüğe girer?", back: "İmzalama yetkisi: MASAK Başkanı. Yürürlüğe girme: Cumhurbaşkanı Kararı ile.", difficulty: "hard" },
      { front: "Yabancı ülke mercileri Türkiye'deki yükümlüler nezdinde denetim yapabilir mi?", back: "Evet, ancak KARŞILIKLILIK İLKESİ şartıyla. Yani karşı ülke de Türk denetçilere kendi ülkesinde denetim izni vermelidir.", difficulty: "medium" }
    ]
    
    for (const fc of flashcards) {
      await prisma.flashcard.create({
        data: {
          courseId: section.courseId,
          sectionId: section.id,
          front: fc.front,
          back: fc.back,
          difficulty: fc.difficulty
        }
      })
    }
    console.log(`✅ +${flashcards.length} flashcard eklendi`)
    
    // Ek sorular
    const questions = [
      {
        text: "MASAK bünyesinde denetim elemanlarının görevlendirilmesi için aşağıdakilerden hangisinin onayı gereklidir?",
        options: JSON.stringify(["A) MASAK Başkanı", "B) Bağlı/ilgili Bakan", "C) Cumhurbaşkanı", "D) BDDK Başkanı"]),
        correct: "B",
        explanation: "Denetim elemanları, Başkanın talebi ve birim amirinin teklifi üzerine bağlı/ilgili Bakanın onayıyla görevlendirilir.",
        difficulty: "hard"
      },
      {
        text: "Uluslararası Mutabakat Muhtıralarını (MoU) imzalama yetkisi aşağıdakilerden hangisine aittir?",
        options: JSON.stringify(["A) Cumhurbaşkanı", "B) Maliye Bakanı", "C) MASAK Başkanı", "D) Hazine Müsteşarı"]),
        correct: "C",
        explanation: "MoU imzalama yetkisi MASAK Başkanına aittir. Ancak yürürlüğe girmesi için Cumhurbaşkanı Kararı gerekir.",
        difficulty: "hard"
      },
      {
        text: "Yabancı ülke mercilerinin Türkiye'deki birimler nezdinde yükümlülük denetimi yapabilmesi için hangi ilke geçerlidir?",
        options: JSON.stringify(["A) Egemenlik ilkesi", "B) Mütekabiliyet (Karşılıklılık) ilkesi", "C) Evrensellik ilkesi", "D) Subsidiarite ilkesi"]),
        correct: "B",
        explanation: "Yabancı ülke denetim yapabilmesi için karşılıklılık ilkesi (reciprocity) gereklidir.",
        difficulty: "medium"
      }
    ]
    
    for (const q of questions) {
      await prisma.question.create({
        data: {
          courseId: section.courseId,
          sectionId: section.id,
          text: q.text,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation,
          difficulty: q.difficulty
        }
      })
    }
    console.log(`✅ +${questions.length} soru eklendi`)
    
    console.log("\n🎉 Bölüm 1 patch tamamlandı!")
  } finally {
    await prisma.$disconnect()
  }
}

patchSection1().catch(console.error)
