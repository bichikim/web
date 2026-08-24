/** @vitest-environment jsdom */

import {describe, expect, it} from 'vitest'

import {deLocalizeHref, localizeHref} from '../../../paraglide/runtime.js'

import {
  getLocalizedActivityOptions,
  getLocalizedGazeOptions,
  getLocalizedSceneLabel,
  getLocalizedTimeOptions,
  getLocalizedWeatherLabel,
} from '../index'

describe('scene localization', () => {
  it('should preserve scene option values and icons while localizing labels', () => {
    expect(getLocalizedTimeOptions({locale: 'en'})).toEqual([
      {icon: 'i-tabler-sun', label: 'Day', value: 'day'},
      {icon: 'i-tabler-moon', label: 'Night', value: 'night'},
      {icon: 'i-tabler-sun-moon', label: 'Auto', value: 'auto'},
    ])
    expect(getLocalizedActivityOptions({locale: 'en'}).map((option) => option.label)).toEqual([
      'Reading',
      'Writing',
      'Typing on a laptop',
    ])
    expect(getLocalizedGazeOptions({locale: 'en'}).map((option) => option.label)).toEqual([
      'Focused',
      'Looking at you',
    ])
  })

  it('should compose the accessible scene label in the selected locale', () => {
    expect(getLocalizedSceneLabel('night', 'reading', 'focused', {locale: 'ko'})).toBe(
      '밤 · 독서 · 집중',
    )
  })

  it('should localize every weather condition without changing its domain value', () => {
    expect(
      ['clear', 'cloudy', 'mixed', 'overcast', 'rain', 'snow', 'unknown'].map((condition) =>
        getLocalizedWeatherLabel(condition as Parameters<typeof getLocalizedWeatherLabel>[0], {
          locale: 'en',
        }),
      ),
    ).toEqual(['Clear', 'Mostly cloudy', 'Rain or snow', 'Overcast', 'Rain', 'Snow', 'Checking'])
  })
})

describe('localized routes', () => {
  it('should prefix both the base and additional locales', () => {
    expect(localizeHref('/', {locale: 'ko'})).toBe('/ko/')
    expect(localizeHref('/', {locale: 'en'})).toBe('/en/')
    expect(localizeHref('/account', {locale: 'ko'})).toBe('/ko/account/')
    expect(deLocalizeHref('/en/account/')).toBe('/account/')
  })
})
