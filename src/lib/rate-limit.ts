/**
 * In-memory rate limiter
 * 
 * ⚠️ PRODUCTION GEÇİŞİ:
 * Serverless ortamlarda (Vercel) in-memory store her fonksiyon çağrısında sıfırlanır.
 * Production'da şu alternatiflerden birini kullanın:
 * 1. Upstash Redis (@upstash/ratelimit) — Vercel uyumlu, ücretsiz tier
 * 2. Redis (ioredis) — Self-hosted
 * 3. Vercel KV — Native entegrasyon
 * 
 * Geçiş örneği:
 * import { Ratelimit } from "@upstash/ratelimit"
 * import { Redis } from "@upstash/redis"
 * const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(30, "60 s") })
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periyodik temizlik (memory leak önleme) — 30 saniyede bir expired entry'leri temizle
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  let cleaned = 0
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key)
      cleaned++
    }
  }
  if (cleaned > 0) console.log(`[RATE_LIMIT] 🧹 ${cleaned} expired entry temizlendi (aktif: ${store.size})`)
}, 30_000)

// Node.js process'in shutdown'da interval'ı temizle
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => clearInterval(cleanupInterval))
}

export function rateLimit(
  key: string,
  limit: number = 30,
  windowMs: number = 60_000
): { success: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1, resetIn: windowMs }
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetIn: entry.resetAt - now }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count, resetIn: entry.resetAt - now }
}

export function getRateLimitHeaders(remaining: number, resetIn: number, limit: number = 30) {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000)),
  }
}
