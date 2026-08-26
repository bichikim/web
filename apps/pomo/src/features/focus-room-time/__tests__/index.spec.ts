import {describe, expect, it} from 'vitest'

import {getAutomaticScenePeriod, getNextTimeMode, resolveScenePeriod} from '../index'

describe('focus room time', () => {
  it.each([
    [6, 'night'],
    [7, 'day'],
    [18, 'day'],
    [19, 'night'],
  ] as const)('should resolve hour %s as %s', (hour, period) => {
    const date = new Date(2026, 0, 1, hour)

    expect(getAutomaticScenePeriod(date)).toBe(period)
  })

  it.each([
    ['auto', 'day'],
    ['day', 'night'],
    ['night', 'auto'],
  ] as const)('should advance %s mode to %s', (mode, nextMode) => {
    expect(getNextTimeMode(mode)).toBe(nextMode)
  })

  it('should reject an unsupported runtime mode', () => {
    expect(() => getNextTimeMode('future' as never)).toThrow('Unsupported scene time mode: future')
  })

  it('should resolve automatic and fixed scene periods', () => {
    expect(resolveScenePeriod('auto', 'night')).toBe('night')
    expect(resolveScenePeriod('day', 'night')).toBe('day')
  })
})
