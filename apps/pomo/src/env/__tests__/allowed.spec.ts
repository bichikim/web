import {describe, expect, it} from 'vitest'

import {allowedStringSchema} from '../allowed'

const VALUES = ['red', 'blue'] as const
const schema = allowedStringSchema('COLOR', VALUES, 'red')

describe('allowedStringSchema', () => {
  it.each(VALUES)('should accept every supported value', (value) => {
    expect(schema.parse(value)).toBe(value)
  })

  it.each([undefined, '', '  '])('should default a blank value', (value) => {
    expect(schema.parse(value)).toBe('red')
  })

  it('should trim a supported value', () => {
    expect(schema.parse('  blue  ')).toBe('blue')
  })

  it('should reject an unsupported value', () => {
    expect(() => schema.parse('green')).toThrow('COLOR must be one of: red, blue')
  })
})
