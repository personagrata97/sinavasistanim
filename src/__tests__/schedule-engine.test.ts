import { describe, it, expect } from 'vitest'
import { getDaysUntilExam, getUrgencyLevel } from '@/lib/schedule-engine'

describe('schedule-engine', () => {
  describe('getDaysUntilExam', () => {
    it('bugün için 0 gün dönmeli', () => {
      const today = new Date()
      expect(getDaysUntilExam(today)).toBe(0)
    })

    it('yarın için 1 gün dönmeli', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(getDaysUntilExam(tomorrow)).toBe(1)
    })

    it('geçmiş tarih için negatif dönmeli', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(getDaysUntilExam(yesterday)).toBeLessThan(0)
    })
  })

  describe('getUrgencyLevel', () => {
    it('0 gün için kritik seviye dönmeli', () => {
      const urgency = getUrgencyLevel(0)
      expect(urgency).toBeDefined()
      expect(urgency.label).toBeTruthy()
      expect(urgency.color).toBeTruthy()
    })

    it('30+ gün için rahat seviye dönmeli', () => {
      const urgency = getUrgencyLevel(60)
      expect(urgency).toBeDefined()
    })

    it('7 gün için orta-yüksek aciliyet dönmeli', () => {
      const urgency = getUrgencyLevel(7)
      expect(urgency).toBeDefined()
    })
  })
})
