import { describe, it, expect } from 'vitest'
import { getCourseBySlug, getCourseByOrder, getExamConfig, ALL_COURSES, SPL_LEVEL_3_COURSES, MASAK_COURSES, SPL_BD_COURSES } from '@/lib/course-data'

describe('course-data', () => {
  describe('SPL_LEVEL_3_COURSES', () => {
    it('12 ders olmalı', () => {
      expect(SPL_LEVEL_3_COURSES).toHaveLength(12)
    })

    it('her dersin gerekli alanları olmalı', () => {
      for (const course of SPL_LEVEL_3_COURSES) {
        expect(course.name).toBeTruthy()
        expect(course.slug).toBeTruthy()
        expect(course.order).toBeGreaterThan(0)
        expect(course.icon).toBeTruthy()
        expect(course.color).toMatch(/^from-/)
      }
    })

    it('slug değerleri benzersiz olmalı', () => {
      const slugs = SPL_LEVEL_3_COURSES.map(c => c.slug)
      expect(new Set(slugs).size).toBe(slugs.length)
    })

    it('sıra numaraları 1-12 arasında olmalı', () => {
      const orders = SPL_LEVEL_3_COURSES.map(c => c.order).sort((a, b) => a - b)
      expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    })
  })

  describe('MASAK_COURSES', () => {
    it('en az 1 ders olmalı', () => {
      expect(MASAK_COURSES.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('SPL_BD_COURSES', () => {
    it('5 ders olmalı', () => {
      expect(SPL_BD_COURSES).toHaveLength(5)
    })
  })

  describe('getCourseBySlug', () => {
    it('geçerli slug ile ders bulmalı', () => {
      const course = getCourseBySlug('sermaye-piyasasi-mevzuati')
      expect(course).toBeDefined()
      expect(course?.name).toContain('Sermaye')
    })

    it('geçersiz slug ile undefined dönmeli', () => {
      expect(getCourseBySlug('nonexistent')).toBeUndefined()
    })
  })

  describe('getCourseByOrder', () => {
    it('geçerli sıra ile ders bulmalı', () => {
      const course = getCourseByOrder(1)
      expect(course).toBeDefined()
      expect(course?.order).toBe(1)
    })

    it('geçersiz sıra ile undefined dönmeli', () => {
      expect(getCourseByOrder(999)).toBeUndefined()
    })
  })

  describe('getExamConfig', () => {
    it('SPL sınavı 25 soru / 45 dk olmalı', () => {
      const config = getExamConfig('spl-duzey-3')
      expect(config?.totalQuestions).toBe(25)
      expect(config?.durationMinutes).toBe(45)
      expect(config?.passingScore).toBe(60)
      expect(config?.negativeMarking).toBe(false)
    })

    it('MASAK sınavı 100 soru / 90 dk olmalı', () => {
      const config = getExamConfig('masak')
      expect(config?.totalQuestions).toBe(100)
      expect(config?.durationMinutes).toBe(90)
      expect(config?.passingScore).toBe(65)
      expect(config?.modules).toHaveLength(2)
    })

    it('geçersiz program için undefined dönmeli', () => {
      expect(getExamConfig('nonexistent')).toBeUndefined()
    })
  })

  describe('ALL_COURSES', () => {
    it('tüm kursları birleştirmeli', () => {
      expect(ALL_COURSES.length).toBe(
        SPL_LEVEL_3_COURSES.length + MASAK_COURSES.length + SPL_BD_COURSES.length
      )
    })

    it('slug değerleri tüm kurslarda benzersiz olmalı', () => {
      const slugs = ALL_COURSES.map(c => c.slug)
      expect(new Set(slugs).size).toBe(slugs.length)
    })
  })
})
