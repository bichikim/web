import {describe, expect, it} from 'vitest'
import {createHistorySourceResolver, normalizeHistorySourceUrl} from '../source-resolver'

const first = 'https://archive.example/first-123456'
const second = 'https://archive.example/second-123456'
const generated = 'https://archive.example/generated-123456'

describe('normalizeHistorySourceUrl', () => {
  it('should remove tracking names without reserializing retained raw query segments', () => {
    expect(
      normalizeHistorySourceUrl(
        'https://www.archive.example/document///?symbol=A/RES/217(III)&q=a%20b&q=a+b&%75TM_Source=x&flag&empty=&utm_medium=y#section',
      ),
    ).toBe('https://archive.example/document?symbol=A/RES/217(III)&q=a%20b&q=a+b&flag&empty=')
  })

  it.each([
    ['https://www.archive.example/?utm_source=x#fragment', 'https://archive.example/'],
    ['https://archive.example/a?&&UTM_SOURCE=x&keep=%2f&', 'https://archive.example/a?&&keep=%2f&'],
    ['https://archive.example/a?q=%&x=a%20b', 'https://archive.example/a?q=%&x=a%20b'],
    [
      'https://www.archive.example/a?utmish=x&x=utm_source',
      'https://archive.example/a?utmish=x&x=utm_source',
    ],
  ])('should preserve native URL normalization for %s', (input, expected) => {
    expect(normalizeHistorySourceUrl(input)).toBe(expected)
  })
})

describe('createHistorySourceResolver', () => {
  it('should return the original searched URL for an exact normalized match', () => {
    const searched = 'https://www.archive.example/a/?utm_source=search#original'
    expect(createHistorySourceResolver([searched])('https://archive.example/a')).toBe(searched)
  })

  it('should prefer exact matching even when article identities are ambiguous', () => {
    const resolve = createHistorySourceResolver([first, second])
    expect(resolve(first)).toBe(first)
    expect(resolve(second)).toBe(second)
    expect(() => resolve(generated)).toThrow(
      new TypeError(`A generated source was not returned by OpenAI web search: ${generated}`),
    )
  })

  it('should retain last-wins exact URL mapping but count duplicate entries for fallback ambiguity', () => {
    const variant = `${first}/?utm_source=last`
    const resolve = createHistorySourceResolver([first, variant])
    expect(resolve(first)).toBe(variant)
    expect(() => resolve(generated)).toThrow(TypeError)
    expect(() => createHistorySourceResolver([first, first])(generated)).toThrow(TypeError)
  })

  it('should resolve a unique six-digit article ID only on the same normalized hostname', () => {
    const searched = 'https://www.archive.example/original-123456/?utm_source=search'
    const resolve = createHistorySourceResolver([searched])
    expect(resolve(generated)).toBe(searched)
    expect(() => resolve('https://other.example/generated-123456')).toThrow(TypeError)
  })

  it.each([
    ['https://archive.example/original-12345', 'https://archive.example/generated-12345'],
    [
      'https://archive.example/original-123456/child',
      'https://archive.example/generated-123456/child',
    ],
    [
      'https://archive.example/document?symbol=A/RES/217(III)',
      'https://archive.example/document?symbol=A/RES/260(III)',
    ],
    ['https://archive.example/document?q=a%20b', 'https://archive.example/document?q=a+b'],
  ])('should reject a different identity for %s', (searched, candidate) => {
    expect(() => createHistorySourceResolver([searched])(candidate)).toThrow(
      new TypeError(`A generated source was not returned by OpenAI web search: ${candidate}`),
    )
  })

  it('should reject invalid searched URLs at construction and invalid citations at resolution', () => {
    expect(() => createHistorySourceResolver(['not a URL'])).toThrow(TypeError)
    expect(() => createHistorySourceResolver([first])('not a URL')).toThrow(TypeError)
    expect(() => createHistorySourceResolver([])(first)).toThrow(TypeError)
  })

  it('should snapshot frozen source inputs and isolate independently created resolvers', () => {
    const sources = [first]
    const resolve = createHistorySourceResolver(sources)
    sources.push(second)
    expect(resolve(generated)).toBe(first)
    expect(createHistorySourceResolver(Object.freeze([second]))(generated)).toBe(second)
    expect(resolve(generated)).toBe(first)
  })
})
