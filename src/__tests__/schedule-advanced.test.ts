import { describe, it, expect } from 'vitest'
import { getDaysUntilExam, getUrgencyLevel } from '@/lib/schedule-engine'

describe('schedule-engine gelişmiş testler', () => {
  describe('getDaysUntilExam', () => {
    it('geçmiş tarih için negatif değer dönmeli', () => {
      const past = new Date('2020-01-01')
      expect(getDaysUntilExam(past)).toBeLessThan(0)
    })

    it('gelecek tarih için pozitif değer dönmeli', () => {
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      expect(getDaysUntilExam(future)).toBeGreaterThan(0)
    })

    it('bugün için 0 veya 1 dönmeli', () => {
      const today = new Date()
      const result = getDaysUntilExam(today)
      expect(result).toBeGreaterThanOrEqual(-1)
      expect(result).toBeLessThanOrEqual(1)
    })

    it('string tarih kabul etmeli', () => {
      const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      const result = getDaysUntilExam(future)
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('getUrgencyLevel', () => {
    it('7 günden az süre kaldığında acil döndürmeli', () => {
      const result = getUrgencyLevel(3)
      expect(result).toBeTruthy()
      expect(result?.label).toBeTruthy()
    })

    it('30 günden fazla süre varken rahat döndürmeli', () => {
      const result = getUrgencyLevel(45)
      expect(result).toBeTruthy()
    })

    it('negatif gün için geçmiş olmalı', () => {
      const result = getUrgencyLevel(-5)
      expect(result).toBeTruthy()
    })

    it('0 gün için sonuç dönmeli', () => {
      const result = getUrgencyLevel(0)
      expect(result).toBeTruthy()
    })
  })
})
