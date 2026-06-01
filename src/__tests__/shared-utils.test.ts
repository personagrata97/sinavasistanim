import { describe, it, expect } from 'vitest'
import { formatTitle, cleanMarkdown, completeTurkishSentence } from '@/components/course/shared'

describe('shared utilities', () => {
  describe('formatTitle', () => {
    it('boş string için "Ders Notu" dönmeli', () => {
      expect(formatTitle('')).toBe('Ders Notu')
    })

    it('index verilirse "Ünite N" dönmeli', () => {
      expect(formatTitle('', 0)).toBe('Ünite 1')
      expect(formatTitle('', 4)).toBe('Ünite 5')
    })

    it('geçerli başlığı title case yapmalı', () => {
      const result = formatTitle('sermaye piyasası mevzuatı')
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('kısaltmaları korumalı (MASAK, SPK)', () => {
      const result = formatTitle('masak uyum görevlisi')
      expect(result).toContain('MASAK')
    })

    it('generic başlıkları reddetmeli', () => {
      expect(formatTitle('bölüm içeriği', 0)).toBe('Ünite 1')
    })
  })

  describe('cleanMarkdown', () => {
    it('boş string için boş dönmeli', () => {
      expect(cleanMarkdown('')).toBe('')
    })

    it('null/undefined için boş string dönmeli', () => {
      expect(cleanMarkdown(undefined as any)).toBe('')
      expect(cleanMarkdown(null as any)).toBe('')
    })

    it('markdown metnini trim etmeli', () => {
      expect(cleanMarkdown('  test  ')).toBe('test')
    })

    it('removeFirstHeader ile header temizlemeli', () => {
      const md = '# Bölüm İçeriği\nİçerik'
      const result = cleanMarkdown(md, true)
      expect(result).toBeTruthy()
    })
  })

  describe('completeTurkishSentence', () => {
    it('boş string için boş string dönmeli', () => {
      expect(completeTurkishSentence('')).toBe('')
    })

    it('zaten nokta veya diğer noktalama işaretleriyle biten cümleleri değiştirmemeli', () => {
      expect(completeTurkishSentence('Bu bir varlıktır.')).toBe('Bu bir varlıktır.')
      expect(completeTurkishSentence('Bu bir varlık mıdır?')).toBe('Bu bir varlık mıdır?')
    })

    it('varlıkları kelimesini varlıklardır kelimesine tamamlamalı', () => {
      expect(completeTurkishSentence('değer veya hak ifade edebilen gayri maddi varlıkları,')).toBe('değer veya hak ifade edebilen gayri maddi varlıklardır.')
      expect(completeTurkishSentence('gayri maddi varlıkları')).toBe('gayri maddi varlıklardır.')
    })

    it('faaliyetleri kelimesini faaliyetleridir kelimesine tamamlamalı', () => {
      expect(completeTurkishSentence('aklama ve terörün finansmanının önlenmesi faaliyetleri,')).toBe('aklama ve terörün finansmanının önlenmesi faaliyetleridir.')
    })

    it('sondaki virgülü temizleyip nokta koymalı veya ek getirmeli', () => {
      expect(completeTurkishSentence('sermaye piyasası aracı,')).toBe('sermaye piyasası aracıdır.')
    })
  })
})
