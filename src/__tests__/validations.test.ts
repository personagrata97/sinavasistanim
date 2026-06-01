import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema, chatRequestSchema, slugSchema, uploadSchema, reviewSchema, validateInput } from '@/lib/validations'

describe('Zod Validations', () => {
  describe('loginSchema', () => {
    it('geçerli login kabul etmeli', () => {
      const result = loginSchema.safeParse({ email: 'test@test.com', password: '123456' })
      expect(result.success).toBe(true)
    })
    it('geçersiz email reddetmeli', () => {
      const result = loginSchema.safeParse({ email: 'invalid', password: '123456' })
      expect(result.success).toBe(false)
    })
    it('kısa şifre reddetmeli', () => {
      const result = loginSchema.safeParse({ email: 'a@b.com', password: '123' })
      expect(result.success).toBe(false)
    })
  })

  describe('registerSchema', () => {
    it('geçerli kayıt kabul etmeli', () => {
      const result = registerSchema.safeParse({ name: 'Selim', email: 'a@b.com', password: '123456' })
      expect(result.success).toBe(true)
    })
    it('kısa isim reddetmeli', () => {
      const result = registerSchema.safeParse({ name: 'A', email: 'a@b.com', password: '123456' })
      expect(result.success).toBe(false)
    })
  })

  describe('chatRequestSchema', () => {
    it('geçerli chat isteği kabul etmeli', () => {
      const result = chatRequestSchema.safeParse({
        courseId: 'abc123',
        messages: [{ role: 'user', content: 'Merhaba' }]
      })
      expect(result.success).toBe(true)
    })
    it('boş courseId reddetmeli', () => {
      const result = chatRequestSchema.safeParse({ courseId: '', messages: [] })
      expect(result.success).toBe(false)
    })
    it('50den fazla mesaj reddetmeli', () => {
      const msgs = Array(51).fill({ role: 'user', content: 'test' })
      const result = chatRequestSchema.safeParse({ courseId: 'abc', messages: msgs })
      expect(result.success).toBe(false)
    })
    it('10000 karakterden uzun mesaj reddetmeli', () => {
      const result = chatRequestSchema.safeParse({
        courseId: 'abc',
        messages: [{ role: 'user', content: 'a'.repeat(10001) }]
      })
      expect(result.success).toBe(false)
    })
    it('geçersiz role reddetmeli', () => {
      const result = chatRequestSchema.safeParse({
        courseId: 'abc',
        messages: [{ role: 'hacker', content: 'test' }]
      })
      expect(result.success).toBe(false)
    })
  })

  describe('slugSchema', () => {
    it('geçerli slug kabul etmeli', () => {
      expect(slugSchema.safeParse('sermaye-piyasasi').success).toBe(true)
    })
    it('büyük harf reddetmeli', () => {
      expect(slugSchema.safeParse('Sermaye').success).toBe(false)
    })
    it('100+ karakter reddetmeli', () => {
      expect(slugSchema.safeParse('a'.repeat(101)).success).toBe(false)
    })
    it('boş slug reddetmeli', () => {
      expect(slugSchema.safeParse('').success).toBe(false)
    })
  })

  describe('uploadSchema', () => {
    it('geçerli upload kabul etmeli', () => {
      const result = uploadSchema.safeParse({ courseId: 'abc', fileName: 'test.pdf', fileSize: 1024 })
      expect(result.success).toBe(true)
    })
    it('100MB üstü reddetmeli', () => {
      const result = uploadSchema.safeParse({ courseId: 'abc', fileName: 'big.pdf', fileSize: 200 * 1024 * 1024 })
      expect(result.success).toBe(false)
    })
  })

  describe('reviewSchema', () => {
    it('geçerli review kabul etmeli', () => {
      expect(reviewSchema.safeParse({ flashcardId: 'abc', quality: 3 }).success).toBe(true)
    })
    it('6 quality reddetmeli', () => {
      expect(reviewSchema.safeParse({ flashcardId: 'abc', quality: 6 }).success).toBe(false)
    })
  })

  describe('validateInput helper', () => {
    it('geçerli input için success dönmeli', () => {
      const result = validateInput(slugSchema, 'test-slug')
      expect(result.success).toBe(true)
      if (result.success) expect(result.data).toBe('test-slug')
    })
    it('geçersiz input için error dönmeli', () => {
      const result = validateInput(slugSchema, '')
      expect(result.success).toBe(false)
      if (!result.success) expect(result.error).toBeTruthy()
    })
  })
})
