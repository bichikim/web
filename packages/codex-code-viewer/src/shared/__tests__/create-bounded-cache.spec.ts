import {describe, expect, it} from 'vitest'
import {createBoundedCache} from '../create-bounded-cache'

describe('createBoundedCache', () => {
  it('should evict the least recently used entry at the count limit', () => {
    const cache = createBoundedCache<string>({
      maxEntries: 2,
      maxWeight: 20,
      weight: (value) => value.length,
    })
    cache.set('a', 'first')
    cache.set('b', 'second')
    expect(cache.get('a')).toBe('first')
    cache.set('c', 'third')
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe('first')
    expect(cache.get('c')).toBe('third')
  })
  it('should enforce the weight limit on insertion and replacement', () => {
    const cache = createBoundedCache<string>({
      maxEntries: 8,
      maxWeight: 5,
      weight: (value) => value.length,
    })
    cache.set('a', 'aa')
    cache.set('b', 'bb')
    cache.set('b', 'bbbb')
    expect(cache.get('a')).toBeUndefined()
    cache.set('huge', '123456')
    expect(cache.get('huge')).toBeUndefined()
    expect(cache.get('b')).toBe('bbbb')
    cache.clear()
    cache.set('c', '12345')
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toBe('12345')
  })
})
