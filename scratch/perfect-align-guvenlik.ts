import { prisma } from "../src/lib/prisma"

async function run() {
  console.log("🚀 [PERFECT ALIGNMENT] Starting database merges and rename for 'Bilgi Sistemleri Güvenliği'...")

  const course = await prisma.course.findFirst({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" }
  })

  if (!course) {
    console.error("❌ Course not found!")
    return
  }

  // ================= MERGE 1: Section 1 (Pages 3-6) + Section 2 (Pages 6-11) =================
  const sec1 = await prisma.section.findFirst({
    where: { courseId: course.id, order: 1 }
  })
  const sec2 = await prisma.section.findFirst({
    where: { courseId: course.id, order: 2 }
  })

  if (sec1 && sec2) {
    console.log(`🔗 Merging Section 1 ("${sec1.title}") and Section 2 ("${sec2.title}")...`)
    const mergedContent = `${sec1.rawContent}\n\n--- İÇİNDEKİLER VE ÖNSÖZ ---\n${sec2.rawContent}`
    
    await prisma.section.update({
      where: { id: sec1.id },
      data: {
        pageEnd: 11,
        rawContent: mergedContent
      }
    })

    await prisma.section.delete({
      where: { id: sec2.id }
    })
    console.log("✅ Merge 1 completed: Sections 1 and 2 merged into Section 1 (Pages 3-11).")
  } else {
    console.error("❌ Section 1 or Section 2 not found!")
  }

  // Reorder remaining 19 sections sequentially (Order 1 through 19)
  let remaining = await prisma.section.findMany({
    where: { courseId: course.id },
    orderBy: { order: "asc" }
  })
  console.log(`Reordering ${remaining.length} sections after Merge 1...`)
  for (let i = 0; i < remaining.length; i++) {
    await prisma.section.update({
      where: { id: remaining[i].id },
      data: { order: i + 1 }
    })
  }

  // ================= MERGE 2: Section 17 ("D) SHA - 256", Pages 112-113) into Section 16 ("VERİ VE İZ KAYITLARININ GÜVENLİĞİ", Pages 101-112) =================
  // After the first merge and reordering:
  // Section 16 is "VERİ VE İZ KAYITLARININ GÜVENLİĞİ" (pages 101-112)
  // Section 17 is "D) SHA - 256" (pages 112-113)
  const sec16 = await prisma.section.findFirst({
    where: { courseId: course.id, order: 16 }
  })
  const sec17 = await prisma.section.findFirst({
    where: { courseId: course.id, order: 17 }
  })

  if (sec16 && sec17) {
    console.log(`🔗 Merging Section 17 ("${sec17.title}") into Section 16 ("${sec16.title}")...`)
    const mergedContent = `${sec16.rawContent}\n\n--- DEĞERLENDİRME SORULARI (SHA-256) ---\n${sec17.rawContent}`
    
    await prisma.section.update({
      where: { id: sec16.id },
      data: {
        pageEnd: 113,
        rawContent: mergedContent
      }
    })

    await prisma.section.delete({
      where: { id: sec17.id }
    })
    console.log("✅ Merge 2 completed: Sections 16 and 17 merged into Section 16 (Pages 101-113).")
  } else {
    console.error("❌ Section 16 or Section 17 not found!")
  }

  // Reorder remaining 18 sections sequentially (Order 1 through 18)
  remaining = await prisma.section.findMany({
    where: { courseId: course.id },
    orderBy: { order: "asc" }
  })
  console.log(`Reordering ${remaining.length} sections after Merge 2...`)
  for (let i = 0; i < remaining.length; i++) {
    await prisma.section.update({
      where: { id: remaining[i].id },
      data: { order: i + 1 }
    })
  }

  // ================= RENAME ALL 18 SECTIONS PERFECTLY =================
  const FINAL_TITLES = [
    { order: 1, title: "Kısaltmalar ve Terimler" },
    { order: 2, title: "BİLGİ GÜVENLİĞİ YÖNETİMİ" },
    { order: 3, title: "VARLIK YÖNETİMİ" },
    { order: 4, title: "FİZİKSEL VE ÇEVRESEL GÜVENLİK" },
    { order: 5, title: "Ağ Güvenliği Giriş ve Temel Kavramlar" },
    { order: 6, title: "İnternet Katmanları (Surface, Deep, Dark Web)" },
    { order: 7, title: "Ağ Çeşitleri (PAN, LAN, WAN, MAN)" },
    { order: 8, title: "Ağ Modelleri (OSI ve TCP/IP Katmanları)" },
    { order: 9, title: "Uygulama Katmanı Protokolleri (SMTP, DNS, HTTP)" },
    { order: 10, title: "Ağ Servisleri ve Port Numaraları" },
    { order: 11, title: "IP Adres Sınıfları (A, B, C, D, E Sınıfları)" },
    { order: 12, title: "Sınıfsız Adresleme (CIDR) ve IPv6 Mimarisi" },
    { order: 13, title: "Kablosuz Ağ Bileşenleri ve Yapısı (AP, BSS, ESS)" },
    { order: 14, title: "Kablosuz Ağ Standartları ve Güvenlik Zafiyetleri" },
    { order: 15, title: "ERİŞİM GÜVENLİĞİ" },
    { order: 16, title: "VERİ VE İZ KAYITLARININ GÜVENLİĞİ" },
    { order: 17, title: "ÜÇÜNCÜ TARAFLARLA İLETİŞİM GÜVENLİĞİ" },
    { order: 18, title: "Bilgi Sistemleri Güvenliği Kaynakçası" }
  ]

  console.log("\n📛 Renaming sections to premium titles...")
  for (const item of FINAL_TITLES) {
    const sec = await prisma.section.findFirst({
      where: { courseId: course.id, order: item.order }
    })
    if (sec) {
      await prisma.section.update({
        where: { id: sec.id },
        data: { title: item.title }
      })
      console.log(`  [Bölüm ${sec.order}] Sayfa ${sec.pageStart}-${sec.pageEnd} -> "${item.title}"`)
    }
  }

  console.log("\n🎉 [SUCCESS] 100% PERFECT DATABASE ALIGNMENT COMPLETED!")
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
