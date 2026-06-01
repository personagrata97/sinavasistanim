import { describe, it, expect, beforeEach } from 'vitest'
import { cache, cached } from '@/lib/cache'

describe('cache layer', () => {
  beforeEach(() => {
    cache.clear()
  })

  it('set ve get çalışmalı', () => {
    cache.set('test-key', { name: 'test' }, 60000)
    const result = cache.get<{ name: string }>('test-key')
    expect(result).toEqual({ name: 'test' })
  })

  it('expire olan entry null dönmeli', () => {
    cache.set('expired', 'value', -1) // negatif TTL = kesin expire
    const result = cache.get('expired')
    expect(result).toBeNull()
  })

  it('var olmayan key null dönmeli', () => {
    expect(cache.get('nonexistent')).toBeNull()
  })

  it('delete çalışmalı', () => {
    cache.set('to-delete', 'value', 60000)
    cache.delete('to-delete')
    expect(cache.get('to-delete')).toBeNull()
  })

  it('invalidate pattern ile silmeli', () => {
    cache.set('course:123:notes', 'n1', 60000)
    cache.set('course:123:questions', 'q1', 60000)
    cache.set('course:456:notes', 'n2', 60000)
    const deleted = cache.invalidate('course:123')
    expect(deleted).toBe(2)
    expect(cache.get('course:123:notes')).toBeNull()
    expect(cache.get('course:456:notes')).toBe('n2')
  })

  it('clear tüm cache\'i temizlemeli', () => {
    cache.set('a', 1, 60000)
    cache.set('b', 2, 60000)
    cache.clear()
    expect(cache.size).toBe(0)
  })

  it('maxSize aşıldığında en eski silinmeli', () => {
    const smallCache = new (cache.constructor as any)(3) as typeof cache
    smallCache.set('a', 1, 60000)
    smallCache.set('b', 2, 60000)
    smallCache.set('c', 3, 60000)
    smallCache.set('d', 4, 60000) // 'a' silinmeli
    expect(smallCache.get('a')).toBeNull()
    expect(smallCache.get('d')).toBe(4)
  })

  describe('cached() helper', () => {
    it('cache miss olunca fetcher çalışmalı', async () => {
      let callCount = 0
      const result = await cached('fetch-test', async () => {
        callCount++
        return 'fetched-value'
      }, 60000)
      expect(result).toBe('fetched-value')
      expect(callCount).toBe(1)
    })

    it('cache hit olunca fetcher çalışmamalı', async () => {
      let callCount = 0
      const fetcher = async () => { callCount++; return 'value' }
      
      await cached('hit-test', fetcher, 60000)
      await cached('hit-test', fetcher, 60000) // 2. çağrı cache'den gelmeli
      expect(callCount).toBe(1)
    })
  })
})
