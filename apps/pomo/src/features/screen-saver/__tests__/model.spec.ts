import {describe, expect, it} from 'vitest'

import {getScreenSaverDelayMilliseconds} from '../model'

describe('getScreenSaverDelayMilliseconds', () => {
  it('should disable the inactivity timer when the preference is off', () => {
    expect(getScreenSaverDelayMilliseconds('off')).toBeNull()
  })

  it('should convert every enabled preference to milliseconds', () => {
    expect(getScreenSaverDelayMilliseconds('5s')).toBe(5_000)
    expect(getScreenSaverDelayMilliseconds('1m')).toBe(60_000)
    expect(getScreenSaverDelayMilliseconds('10m')).toBe(600_000)
    expect(getScreenSaverDelayMilliseconds('20m')).toBe(1_200_000)
    expect(getScreenSaverDelayMilliseconds('1h')).toBe(3_600_000)
  })

  it('should preserve runtime exhaustiveness for an unknown preference', () => {
    expect(getScreenSaverDelayMilliseconds('future' as never)).toBe('future')
  })
})
