import {icons} from '@iconify-json/tabler'
import {describe, expect, it} from 'vitest'

import scribbleIcons from '../../../../icon-sets/scribble.json'
import type {WeatherCondition} from '../contract'
import {getWeatherPresentation} from '../presentation'

const CONDITIONS = [
  'clear',
  'cloudy',
  'mixed',
  'overcast',
  'rain',
  'snow',
  'unknown',
] as const satisfies readonly WeatherCondition[]

const hasWeatherIcon = (iconClass: string): boolean => {
  if (iconClass.startsWith('i-tabler-')) {
    return iconClass.replace(/^i-tabler-/u, '') in icons.icons
  }

  if (iconClass.startsWith('i-pomo-scribble-')) {
    return iconClass.replace(/^i-pomo-scribble-/u, '') in scribbleIcons.icons
  }

  return false
}

describe('getWeatherPresentation', () => {
  it('should map every weather condition to an available icon', () => {
    for (const condition of CONDITIONS) {
      const iconClass = getWeatherPresentation(condition).icon

      expect(hasWeatherIcon(iconClass)).toBe(true)
    }
  })
})
