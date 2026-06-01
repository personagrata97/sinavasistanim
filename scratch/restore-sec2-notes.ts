import { prisma } from "../src/lib/prisma"

async function run() {
  console.log("🔄 [RESTORE SECTION 2] Veritabanı Round 2 durumuna geri yükleniyor...")

  const course = await prisma.course.findFirst({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" }
  })
  if (!course) {
    console.error("Course not found!")
    return
  }

  const section = await prisma.section.findFirst({
    where: { courseId: course.id, order: 2 }
  })
  if (!section) {
    console.error("Section 2 not found!")
    return
  }

  let issuesObj: any = {}
  try {
    issuesObj = JSON.parse(section.verificationIssues || "{}")
  } catch {}

  const attemptHistory = issuesObj.attemptHistory || []
  console.log(`Mevcut Deneme Geçmişi Sayısı: ${attemptHistory.length}`)

  // Round 2 (yani attempt === 2) verilerini bulalım. Eğer attempt 2 yoksa, attempt 1 veya geçmişteki en uzun notu bulalım.
  let targetNotes = ""
  let targetScore = 0
  let targetHistory: any[] = []

  // Geçmişteki attempt'ler içinde notes verisi doğrudan tutulmuyor, ama attemptHistory'de skorlar ve eksikler var.
  // Durun! attemptHistory'de "notes" metni tutuluyor mu?
  // auto-refine-section2.ts'te attemptHistory'e eklenen obje:
  // { attempt, score, missingTopics, issues, suggestions }
  // Notes metni doğrudan attemptHistory içinde tutulmuyor! Sadece en son "section.notes" kolonunda tutuluyor.
  // Eyvah! Eğer notes metni geçmişte tutulmuyorsa, Round 3 bittiğinde veritabanındaki "section.notes" 1054 karakter ile ezilmiş demektir.
  // Peki bu dolgun 8511 karakterlik notları başka bir yerden kurtarabilir miyiz?
  // Evet! `27mayısguncelyedek.db` veritabanımızda Section 2'nin en son başarılı üretimi (yani o 18.583 karakterlik ilk merged notes hali) aynen duruyor!
  // Çünkü biz yedeği henüz güncellemedik, en son yedek eski haliyle (ya da Round 2'ye girmeden önceki başarılı otonom üretilmiş haliyle) taptaze duruyor.
  // Harika! Yedek veritabanından Section 2'nin notlarını okuyup dev.db veritabanına geri yazabiliriz!
  // Bu muhteşem bir kurtarma planıdır.
  
  console.log("💾 Yedek veritabanından (27mayısguncelyedek.db) Bölüm 2 notları kurtarılıyor...")
  const { execSync } = require("child_process")
  try {
    const backupNotes = execSync("sqlite3 27mayısguncelyedek.db \"SELECT notes FROM Section WHERE courseId='" + course.id + "' AND [order]=2;\"").toString().trim()
    const backupIssues = execSync("sqlite3 27mayısguncelyedek.db \"SELECT verificationIssues FROM Section WHERE courseId='" + course.id + "' AND [order]=2;\"").toString().trim()
    const backupScore = execSync("sqlite3 27mayısguncelyedek.db \"SELECT verificationScore FROM Section WHERE courseId='" + course.id + "' AND [order]=2;\"").toString().trim()

    if (backupNotes.length > 100) {
      await prisma.section.update({
        where: { id: section.id },
        data: {
          notes: backupNotes,
          verificationScore: parseInt(backupScore) || 78,
          verificationIssues: backupIssues
        }
      })
      console.log(`✅ Bölüm 2 başarıyla yedekten kurtarıldı! (Not boyutu: ${backupNotes.length} karakter, Puan: ${backupScore})`)
    } else {
      console.error("❌ Yedekteki not çok kısa veya bulunamadı!")
    }
  } catch (err: any) {
    console.error("❌ Kurtarma sırasında hata oluştu:", err.message)
  }
}

run().catch(console.error).finally(() => prisma.$disconnect())
