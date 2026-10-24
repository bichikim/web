import {describe, expect, it} from 'vitest'
import {formatDuration} from '..'

describe('formatDuration', () => {
  it.each([
    ['HH:mm:ss', '01:01:01'],
    ['m[분] s[초]', '1분 1초'],
    ['[time] HH:mm:ss', 'time 01:01:01'],
  ])('should support the Day.js format %s', (format, expected) => {
    expect(formatDuration(3661000, format)).toBe(expected)
  })
  it('should round across an hour boundary before formatting', () => {
    expect(formatDuration(3599500, 'HH:mm:ss')).toBe('01:00:00')
  })

  it.each([
    [0, '0:00'],
    [499, '0:00'],
    [500, '0:01'],
    [59499, '0:59'],
    [59500, '1:00'],
    [61000, '1:01'],
    [3600000, '60:00'],
    [3661000, '61:01'],
    [90061000, '1501:01'],
  ])('should format %i milliseconds as %s', (milliseconds, expected) => {
    expect(formatDuration(milliseconds)).toBe(expected)
  })
})
