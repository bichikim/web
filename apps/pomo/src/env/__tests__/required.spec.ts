import {describe, expect, it} from 'vitest'

import {defaultedStringSchema, optionalStringSchema, requiredStringSchema} from '../required'

describe('requiredStringSchema', () => {
  const schema = requiredStringSchema('FOO')

  it('should return a trimmed value', () => {
    expect(schema.parse('  bar  ')).toBe('bar')
  })

  it.each(['', '  '])('should reject a missing value', (value) => {
    expect(() => schema.parse(value)).toThrow('FOO is not set')
  })
})

describe('optionalStringSchema', () => {
  it.each([undefined, '', '  '])('should treat a blank value as omitted', (value) => {
    expect(optionalStringSchema.parse(value)).toBeUndefined()
  })

  it('should return a trimmed value', () => {
    expect(optionalStringSchema.parse('  bar  ')).toBe('bar')
  })
})

describe('defaultedStringSchema', () => {
  const schema = defaultedStringSchema('fallback')

  it.each([undefined, '', '  '])('should fall back when the value is blank', (value) => {
    expect(schema.parse(value)).toBe('fallback')
  })

  it('should return a trimmed value', () => {
    expect(schema.parse('  explicit  ')).toBe('explicit')
  })
})
