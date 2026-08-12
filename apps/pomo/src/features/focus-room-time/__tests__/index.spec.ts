import {describe, expect, it} from 'vitest'

import {getAutomaticScenePeriod, getNextTimeMode, resolveScenePeriod} from '../index'

describe('getAutomaticScenePeriod', () => {
  it('should use the local daytime window from 7 through 18', () => {
    expect(getAutomaticScenePeriod(new Date(2026, 0, 1, 6, 59))).toBe('night')
    expect(getAutomaticScenePeriod(new Date(2026, 0, 1, 7))).toBe('day')
    expect(getAutomaticScenePeriod(new Date(2026, 0, 1, 18, 59))).toBe('day')
    expect(getAutomaticScenePeriod(new Date(2026, 0, 1, 19))).toBe('night')
  })
})

describe('getNextTimeMode', () => {
  it('should cycle through day, night, and auto in order', () => {
    expect(getNextTimeMode('day')).toBe('night')
    expect(getNextTimeMode('night')).toBe('auto')
    expect(getNextTimeMode('auto')).toBe('day')
  })
})

describe('resolveScenePeriod', () => {
  it('should use the detected period only in auto mode', () => {
    expect(resolveScenePeriod('auto', 'night')).toBe('night')
    expect(resolveScenePeriod('day', 'night')).toBe('day')
    expect(resolveScenePeriod('night', 'day')).toBe('night')
  })
})
