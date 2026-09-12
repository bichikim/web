import {describe, expect, it} from 'vitest'

import {formatLocalDate} from '..'

describe('formatLocalDate', () => {
  it('should format the local calendar date', () => {
    expect(formatLocalDate(new Date(2026, 11, 31, 9, 5))).toBe('2026-12-31')
  })
})
