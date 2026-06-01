import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('env-validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv, NODE_ENV: 'test' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('tüm zorunlu env varları doluyken valid olmalı', async () => {
    process.env.NEXTAUTH_SECRET = 'a'.repeat(32)
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    process.env.DATABASE_URL = 'file:./prisma/dev.db'
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'

    const { validateEnv } = await import('@/lib/env-validation')
    const result = validateEnv()
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('zorunlu env eksikken invalid olmalı', async () => {
    delete process.env.NEXTAUTH_SECRET
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY

    const { validateEnv } = await import('@/lib/env-validation')
    const result = validateEnv()
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('kısa NEXTAUTH_SECRET için uyarı vermeli', async () => {
    process.env.NEXTAUTH_SECRET = 'short'
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    process.env.DATABASE_URL = 'file:./prisma/dev.db'
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key'

    const { validateEnv } = await import('@/lib/env-validation')
    const result = validateEnv()
    expect(result.warnings.some(w => w.includes('kısa'))).toBe(true)
  })
})
