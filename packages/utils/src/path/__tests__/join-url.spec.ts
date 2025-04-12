import {createJoinUrl, joinUrl} from 'src/path/join-url'
import {describe, expect, it} from 'vitest'

describe('createJoinUrl', () => {
  it('should return resolveUrl', () => {
    const resolveUrl = createJoinUrl()
    const url = resolveUrl('/foo', '///bar/', 'john')

    expect(url).toBe('foo/bar/john')
  })

  it('should return resolveUrl with a custom separator', () => {
    const resolveUrl = createJoinUrl('~')
    const url = resolveUrl('~foo', '~~~bar~', 'john')

    expect(url).toBe('foo~bar~john')
  })
})

describe('join-url', () => {
  it('should right url', () => {
    const url = joinUrl('/foo', '///bar/', 'john')

    expect(url).toBe('foo/bar/john')
  })

  it('should resolve', () => {
    const url = joinUrl('foo///bar', '///bar/', 'john')

    expect(url).toBe('foo/bar/bar/john')
  })
})
