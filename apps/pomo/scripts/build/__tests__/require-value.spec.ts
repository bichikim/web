/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {requireValue} from '../require-value.mjs'

describe('requireValue', () => {
  it.each(['value', '  value\t\n', '\u00a0value\u3000'])('should trim %j', (value) => {
    expect(requireValue(value, 'SETTING')).toBe('value')
  })

  it.each([undefined, '', ' \t\n', '\u00a0\u3000'])('should reject %j with its name', (value) => {
    expect(() => requireValue(value, 'SETTING')).toThrow(new TypeError('SETTING is required.'))
  })

  it('should retain interior whitespace and zero text', () => {
    expect(requireValue('  one two  ', 'SETTING')).toBe('one two')
    expect(requireValue('  0  ', 'SETTING')).toBe('0')
  })

  it('should preserve an error thrown while reading trim', () => {
    expect.assertions(1)
    const error = new Error('trim getter failure')
    const value = {
      get trim() {
        throw error
      },
    }

    try {
      Reflect.apply(requireValue, undefined, [value, 'SETTING'])
    } catch (received) {
      expect(received).toBe(error)
    }
  })

  it('should read trim once and call it with its original receiver', () => {
    const reads: Array<string> = []
    const value = {
      get trim() {
        reads.push('read')
        return function trim(this: unknown) {
          expect(this).toBe(value)
          reads.push('call')
          return 'value'
        }
      },
    }

    expect(Reflect.apply(requireValue, undefined, [value, 'SETTING'])).toBe('value')
    expect(reads).toEqual(['read', 'call'])
  })
})
