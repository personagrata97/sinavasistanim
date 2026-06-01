import { describe, it, expect } from 'vitest'
import { getCourseBySlug, getCourseByOrder, getExamConfig, ALL_COURSES, SPL_LEVEL_3_COURSES, MASAK_COURSES, SPL_BD_COURSES, MASAK_EXAM_CONFIG, SPL_EXAM_CONFIG } from '@/lib/course-data'

describe('course-data gelişmiş testler', () => {
  describe('veri bütünlüğü', () => {
    it('tüm kursların slug\'ı benzersiz olmalı', () => {
      const slugs = ALL_COURSES.map(c => c.slug)
      const uniqueSlugs = new Set(slugs)
      expect(slugs.length).toBe(uniqueSlugs.size)
    })

    it('tüm kursların geçerli icon adı olmalı', () => {
      ALL_COURSES.forEach(c => {
        expect(c.icon).toBeTruthy()
        expect(typeof c.icon).toBe('string')
        expect(c.icon.length).toBeGreaterThan(0)
      })
    })

    it('tüm kursların geçerli renk gradient olmalı', () => {
      ALL_COURSES.forEach(c => {
        expect(c.color).toContain('from-')
        expect(c.color).toContain('to-')
      })
    })

    it('SPL Level 3 12 ders olmalı', () => {
      expect(SPL_LEVEL_3_COURSES.length).toBe(12)
    })

    it('MASAK 1 ders olmalı', () => {
      expect(MASAK_COURSES.length).toBe(1)
    })

    it('SPL BD 5 ders olmalı', () => {
      expect(SPL_BD_COURSES.length).toBe(5)
    })

    it('ALL_COURSES toplam 18 olmalı', () => {
      expect(ALL_COURSES.length).toBe(18)
    })

    it('her kursun order numarası pozitif olmalı', () => {
      ALL_COURSES.forEach(c => {
        expect(c.order).toBeGreaterThan(0)
      })
    })
  })

  describe('sınav konfigürasyonu', () => {
    it('MASAK sınavı 100 soru olmalı', () => {
      expect(MASAK_EXAM_CONFIG.totalQuestions).toBe(100)
    })

    it('MASAK geçme notu 65 olmalı', () => {
      expect(MASAK_EXAM_CONFIG.passingScore).toBe(65)
    })

    it('SPL sınavı ders başına 25 soru olmalı', () => {
      expect(SPL_EXAM_CONFIG.totalQuestions).toBe(25)
    })

    it('yanlış doğruyu götürmemeli', () => {
      expect(MASAK_EXAM_CONFIG.negativeMarking).toBe(false)
      expect(SPL_EXAM_CONFIG.negativeMarking).toBe(false)
    })

    it('getExamConfig doğru config dönmeli', () => {
      expect(getExamConfig('masak')).toBe(MASAK_EXAM_CONFIG)
      expect(getExamConfig('spl-duzey-3')).toBe(SPL_EXAM_CONFIG)
    })

    it('bilinmeyen program için undefined dönmeli', () => {
      expect(getExamConfig('bilinmeyen')).toBeUndefined()
    })
  })

  describe('getCourseByOrder', () => {
    it('geçerli order ile kurs bulmalı', () => {
      const c = getCourseByOrder(1)
      expect(c).toBeTruthy()
      expect(c?.name).toContain('Sermaye Piyasası')
    })

    it('geçersiz order için undefined dönmeli', () => {
      expect(getCourseByOrder(999)).toBeUndefined()
    })
  })
})
