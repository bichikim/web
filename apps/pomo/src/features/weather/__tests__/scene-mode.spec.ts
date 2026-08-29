import {describe, expect, it} from 'vitest'

import {isWeatherSceneMode, resolveWeatherSceneCondition} from '../scene-mode'

describe('isWeatherSceneMode', () => {
  it.each(['auto', 'clear', 'rain', 'snow', 'cloudy', 'overcast'] as const)(
    'should accept %s',
    (mode) => {
      expect(isWeatherSceneMode(mode)).toBe(true)
    },
  )

  it.each([null, 'mixed', 'unknown'])('should reject %s', (mode) => {
    expect(isWeatherSceneMode(mode)).toBe(false)
  })
})

describe('resolveWeatherSceneCondition', () => {
  it.each(['clear', 'rain', 'snow', 'cloudy', 'overcast'] as const)(
    'should preserve the manual %s selection',
    (mode) => {
      expect(resolveWeatherSceneCondition(mode, 'unknown')).toBe(mode)
    },
  )

  it.each([
    ['clear', 'clear'],
    ['cloudy', 'cloudy'],
    ['overcast', 'overcast'],
    ['mixed', 'rain'],
    ['rain', 'rain'],
    ['snow', 'snow'],
    ['unknown', 'clear'],
  ] as const)('should map automatic %s weather to %s', (condition, sceneCondition) => {
    expect(resolveWeatherSceneCondition('auto', condition)).toBe(sceneCondition)
  })
})
