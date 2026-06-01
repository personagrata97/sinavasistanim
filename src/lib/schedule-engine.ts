// Çalışma Programı Oluşturma Motoru
// Sınav tarihine ve seviyeye göre dinamik program

import { addDays, differenceInDays, format, startOfDay } from "date-fns"

export interface ScheduleItem {
  date: Date
  task: string
  type: "reading" | "questions" | "flashcards" | "review" | "mock_exam"
  duration: number // dakika
  sectionIds: string[]
}

interface ScheduleConfig {
  examDate: Date
  userLevel: "beginner" | "intermediate" | "advanced"
  totalSections: number
  sectionTitles: string[]
  sectionIds: string[]
  weakSectionIds?: string[] // E-25: Zayıf bölümler adaptif planlama için
}

// Seviyeye göre süre dağılımı (yüzde)
const LEVEL_DISTRIBUTION = {
  beginner: { reading: 0.60, questions: 0.20, flashcards: 0.10, review: 0.05, mock_exam: 0.05 },
  intermediate: { reading: 0.40, questions: 0.30, flashcards: 0.10, review: 0.10, mock_exam: 0.10 },
  advanced: { reading: 0.25, questions: 0.30, flashcards: 0.10, review: 0.15, mock_exam: 0.20 },
}

export function generateStudySchedule(config: ScheduleConfig): ScheduleItem[] {
  const today = startOfDay(new Date())
  const examDay = startOfDay(config.examDate)
  const totalDays = differenceInDays(examDay, today)

  if (totalDays <= 0) {
    return [{
      date: today,
      task: "Sınav tarihi geçmiş veya bugün. Lütfen tarihi güncelleyin.",
      type: "review",
      duration: 0,
      sectionIds: [],
    }]
  }

  const dist = LEVEL_DISTRIBUTION[config.userLevel]
  const schedule: ScheduleItem[] = []

  // Faz süreleri
  const readingDays = Math.max(1, Math.floor(totalDays * dist.reading))
  const questionDays = Math.max(1, Math.floor(totalDays * dist.questions))
  const flashcardDays = Math.max(1, Math.floor(totalDays * dist.flashcards))
  const reviewDays = Math.max(1, Math.floor(totalDays * dist.review))
  const mockDays = Math.max(1, totalDays - readingDays - questionDays - flashcardDays - reviewDays)

  let currentDay = 0

  // === FAZ 1: OKUMA ===
  const sectionsPerDay = Math.max(1, Math.ceil(config.totalSections / readingDays))
  for (let d = 0; d < readingDays && currentDay < totalDays; d++) {
    const startIdx = d * sectionsPerDay
    const endIdx = Math.min(startIdx + sectionsPerDay, config.totalSections)
    const todaySections = config.sectionTitles.slice(startIdx, endIdx)
    const todaySectionIds = config.sectionIds.slice(startIdx, endIdx)

    if (todaySections.length === 0) break

    // E-25: Zayıf bölümlere daha fazla süre ayır
    const hasWeakSection = config.weakSectionIds?.some(wid => todaySectionIds.includes(wid))
    const baseDuration = Math.min(180, todaySections.length * 45)

    schedule.push({
      date: addDays(today, currentDay),
      task: `Okuma: ${todaySections.length} Bölüm (${todaySections[0].substring(0, 20)}...)${hasWeakSection ? " ⚠️ Zayıf Konu" : ""}`,
      type: "reading",
      duration: hasWeakSection ? Math.min(240, baseDuration * 1.5) : baseDuration,
      sectionIds: todaySectionIds,
    })
    currentDay++
  }

  // === FAZ 2: SORU ÇÖZME ===
  // E-25: Zayıf bölümlere öncelik ver
  const orderedSectionIds = [...(config.weakSectionIds || []), ...config.sectionIds.filter(id => !config.weakSectionIds?.includes(id))]
  const orderedTitles = orderedSectionIds.map(id => {
    const idx = config.sectionIds.indexOf(id)
    return idx >= 0 ? config.sectionTitles[idx] : "Karma Sorular"
  })

  for (let d = 0; d < questionDays && currentDay < totalDays; d++) {
    const sectionIdx = d % orderedSectionIds.length
    const isWeak = config.weakSectionIds?.includes(orderedSectionIds[sectionIdx])
    schedule.push({
      date: addDays(today, currentDay),
      task: `Soru Çözme: ${orderedTitles[sectionIdx] || "Karma Sorular"} (50 soru)${isWeak ? " 🎯 Telafi" : ""}`,
      type: "questions",
      duration: isWeak ? 90 : 60,
      sectionIds: orderedSectionIds[sectionIdx] ? [orderedSectionIds[sectionIdx]] : [],
    })
    currentDay++
  }

  // === FAZ 3: FLASHCARD ===
  for (let d = 0; d < flashcardDays && currentDay < totalDays; d++) {
    schedule.push({
      date: addDays(today, currentDay),
      task: `Flashcard Tekrarı: Tüm konular (30 kart)`,
      type: "flashcards",
      duration: 30,
      sectionIds: [],
    })
    currentDay++
  }

  // === FAZ 4: TEKRAR ===
  for (let d = 0; d < reviewDays && currentDay < totalDays; d++) {
    schedule.push({
      date: addDays(today, currentDay),
      task: `Genel Tekrar: Zayıf konulara odaklanma`,
      type: "review",
      duration: 60,
      sectionIds: config.weakSectionIds || [],
    })
    currentDay++
  }

  // === FAZ 5: DENEME SINAVI ===
  for (let d = 0; d < mockDays && currentDay < totalDays; d++) {
    schedule.push({
      date: addDays(today, currentDay),
      task: `Deneme Sınavı #${d + 1}`,
      type: "mock_exam",
      duration: 90,
      sectionIds: [],
    })
    currentDay++
  }

  return schedule
}

export function getDaysUntilExam(examDate: Date | null): number {
  if (!examDate) return -1
  return differenceInDays(startOfDay(examDate), startOfDay(new Date()))
}

export function getUrgencyLevel(daysLeft: number): { label: string; color: string; icon: string } {
  if (daysLeft < 0) return { label: "Sınav Geçti", color: "text-slate-500", icon: "Clock" }
  if (daysLeft <= 7) return { label: "Kritik!", color: "text-red-500", icon: "AlertTriangle" }
  if (daysLeft <= 14) return { label: "Acil", color: "text-orange-500", icon: "Zap" }
  if (daysLeft <= 30) return { label: "Hızlan", color: "text-amber-500", icon: "Timer" }
  if (daysLeft <= 60) return { label: "İyi Tempo", color: "text-emerald-500", icon: "CheckCircle" }
  return { label: "Rahat", color: "text-blue-500", icon: "Coffee" }
}
