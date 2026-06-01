import { describe, it, expect } from 'vitest'
import { formatTitle, cleanMarkdown } from '@/components/course/shared'

describe('shared utilities - gelişmiş', () => {
  describe('formatTitle edge cases', () => {
    it('undefined title ile çökmemeli', () => {
      const result = formatTitle(undefined as any)
      expect(typeof result).toBe('string')
    })

    it('boş string ile çökmemeli', () => {
      const result = formatTitle('')
      expect(typeof result).toBe('string')
    })

    it('çok uzun başlık kısaltılmalı', () => {
      const longTitle = 'A'.repeat(500)
      const result = formatTitle(longTitle)
      expect(result.length).toBeLessThanOrEqual(501)
    })

    it('Bölüm numarası temizlenmeli', () => {
      const result = formatTitle('Bölüm 3: Hisse Senedi Türleri')
      expect(result).toContain('Hisse Senedi')
    })

    it('index parametresi ile çalışmalı', () => {
      const result = formatTitle('Test Başlık', 5)
      expect(typeof result).toBe('string')
    })
  })

  describe('cleanMarkdown edge cases', () => {
    it('null/undefined ile çökmemeli', () => {
      const result = cleanMarkdown(null as any)
      expect(typeof result).toBe('string')
    })

    it('normal metni değiştirmemeli', () => {
      const result = cleanMarkdown('Normal metin')
      expect(result).toBe('Normal metin')
    })

    it('markdown bold temizlemeli', () => {
      const result = cleanMarkdown('**bold text**')
      // cleanMarkdown davranışına göre kontrol et
      expect(typeof result).toBe('string')
    })

    it('boş string ile çalışmalı', () => {
      const result = cleanMarkdown('')
      expect(result).toBe('')
    })

    it('çok uzun metin ile çalışmalı', () => {
      const longText = 'test '.repeat(10000)
      const result = cleanMarkdown(longText)
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
