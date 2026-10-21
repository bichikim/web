/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {parseClockTime} from '..'

describe('parseClockTime', () => {
  it('should normalize valid ASCII and fullwidth clock components', () => {
    expect(parseClockTime('09', '05')).toEqual({hour: 9, minute: 5})
    expect(parseClockTime('２４', '００')).toEqual({hour: 24, minute: 0})
    expect(parseClockTime('23', '59')).toEqual({hour: 23, minute: 59})
  })

  it.each([
    ['24', '01'],
    ['25', '00'],
    ['09', '60'],
    ['009', '05'],
    ['+9', '05'],
    ['-9', '05'],
    ['9', '5,0'],
  ])('should reject invalid clock components %s:%s', (hour, minute) => {
    expect(parseClockTime(hour, minute)).toBeNull()
  })
})
