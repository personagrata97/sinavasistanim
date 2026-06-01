/**
 * Basit in-memory cache layer
 * Production'da Redis ile değiştirilmeli
 * TTL (Time-to-live) destekli
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>()
  private maxSize: number

  constructor(maxSize = 500) {
    this.maxSize = maxSize
    // Periyodik temizlik (memory leak önleme)
    setInterval(() => this.cleanup(), 30_000)
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  set<T>(key: string, value: T, ttlMs: number = 60_000): void {
    // LRU benzeri: max size'a ulaşınca en eski entry'leri sil
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value
      if (firstKey) this.store.delete(firstKey)
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  /** Pattern ile silme (cache invalidation) */
  invalidate(pattern: string): number {
    let count = 0
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key)
        count++
      }
    }
    return count
  }

  clear(): void {
    this.store.clear()
  }

  get size(): number {
    return this.store.size
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key)
    }
  }
}

// Singleton instance
export const cache = new MemoryCache()

/**
 * Cache-through helper
 * Önce cache'e bakar, yoksa fetcher'ı çalıştırır ve sonucu cache'ler
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 60_000
): Promise<T> {
  const existing = cache.get<T>(key)
  if (existing !== null) return existing

  const result = await fetcher()
  cache.set(key, result, ttlMs)
  return result
}
