import {describe, expect, it} from 'vitest'

import {urlSchema} from '../url'

const schema = urlSchema('ORIGIN', ['https:', 'http:'])

describe('urlSchema', () => {
  it('should return a trimmed URL', () => {
    expect(schema.parse(' https://example.com/path ')).toBe('https://example.com/path')
  })

  it.each(['', '  '])('should reject a missing URL', (value) => {
    expect(() => schema.parse(value)).toThrow('ORIGIN is not set')
  })

  it('should reject an invalid URL without echoing its value', () => {
    const invalidUrl = 'not-a-url-with-sensitive-text'

    expect(() => schema.parse(invalidUrl)).toThrow('ORIGIN must be a valid URL')

    try {
      schema.parse(invalidUrl)
    } catch (error) {
      expect(String(error)).not.toContain(invalidUrl)
    }
  })

  it('should reject a URL with an unsupported protocol', () => {
    expect(() => schema.parse('ftp://example.com')).toThrow('ORIGIN must use https: or http:')
  })
})
