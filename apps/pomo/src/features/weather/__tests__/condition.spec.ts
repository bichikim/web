import {expect, it} from 'vitest'

import {resolveWeatherCondition} from '../condition'

it.each([
  ['rain', 'clear', 'rain'],
  ['mixed', 'cloudy', 'mixed'],
  ['snow', 'overcast', 'snow'],
] as const)('should prioritize %s precipitation over sky', (precipitation, sky, condition) => {
  expect(resolveWeatherCondition({precipitation, sky})).toBe(condition)
})

it.each(['clear', 'cloudy', 'overcast'] as const)(
  'should display %s when there is no precipitation',
  (sky) => {
    expect(resolveWeatherCondition({precipitation: 'none', sky})).toBe(sky)
  },
)

it('should report an unknown condition when current sky data is unavailable', () => {
  expect(resolveWeatherCondition({precipitation: 'none', sky: null})).toBe('unknown')
})
