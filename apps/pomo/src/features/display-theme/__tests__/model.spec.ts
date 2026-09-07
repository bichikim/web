import {describe, expect, it} from 'vitest'

import {resolveDisplayColorScheme} from '../model'

describe('resolveDisplayColorScheme', () => {
  it('should resolve every explicit and system preference', () => {
    expect(resolveDisplayColorScheme('dark', false)).toBe('dark')
    expect(resolveDisplayColorScheme('bright', true)).toBe('light')
    expect(resolveDisplayColorScheme('system', true)).toBe('dark')
    expect(resolveDisplayColorScheme('system', false)).toBe('light')
  })

  it('should preserve runtime exhaustiveness for an unknown preference', () => {
    expect(resolveDisplayColorScheme('future' as never, false)).toBe('future')
  })
})
