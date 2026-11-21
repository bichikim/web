/** @vitest-environment node */
import {icons} from '@iconify-json/tabler'
import {describe, expect, it} from 'vitest'

import scribbleIcons from '../../../../scripts/unocss/scribble.json'
import {WEATHER_CONDITIONS, type WeatherCondition} from '../contract'
import {getWeatherIcon} from '../presentation'

const EXPECTED_ICONS = {
  clear: 'i-tabler-sun',
  cloudy: 'i-pomo-scribble-clouds',
  mixed: 'i-tabler-cloud-snow',
  overcast: 'i-tabler-cloud-filled',
  rain: 'i-tabler-cloud-rain',
  snow: 'i-tabler-snowflake',
  unknown: 'i-tabler-cloud-question',
} as const satisfies Readonly<Record<WeatherCondition, string>>

const hasWeatherIcon = (iconClass: string): boolean => {
  if (iconClass.startsWith('i-tabler-')) {
    return iconClass.replace(/^i-tabler-/u, '') in icons.icons
  }

  if (iconClass.startsWith('i-pomo-scribble-')) {
    return iconClass.replace(/^i-pomo-scribble-/u, '') in scribbleIcons.icons
  }

  return false
}

describe('getWeatherIcon', () => {
  it.each(WEATHER_CONDITIONS)('should preserve the available icon for %s', (condition) => {
    const iconClass = getWeatherIcon(condition)

    expect(iconClass).toBe(EXPECTED_ICONS[condition])
    expect(hasWeatherIcon(iconClass)).toBe(true)
  })
})
