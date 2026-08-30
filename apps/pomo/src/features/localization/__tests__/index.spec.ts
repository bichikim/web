/** @vitest-environment jsdom */

import {describe, expect, it} from 'vitest'

import {
  getLocalizedActivityOptions,
  getLocalizedGazeOptions,
  getLocalizedSceneLabel,
  getLocalizedTimeOptions,
  getLocalizedWeatherCityOptions,
  getLocalizedWeatherLabel,
  getLocalizedWeatherLocationLabel,
  getLocalizedWeatherSceneModeOptions,
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

  it('should localize every supported weather city without changing its slug', () => {
    expect(getLocalizedWeatherCityOptions({locale: 'en'})).toEqual([
      {label: 'Seoul', value: 'seoul'},
      {label: 'Busan', value: 'busan'},
      {label: 'Daegu', value: 'daegu'},
      {label: 'Incheon', value: 'incheon'},
      {label: 'Gwangju', value: 'gwangju'},
      {label: 'Daejeon', value: 'daejeon'},
      {label: 'Ulsan', value: 'ulsan'},
      {label: 'Jeju', value: 'jeju'},
    ])
  })

  it('should preserve provider labels for searched world locations', () => {
    expect(
      getLocalizedWeatherLocationLabel({
        country: 'Japan',
        id: 'openweather:35.6900,139.6900',
        name: 'Tokyo',
        region: 'Tokyo',
      }),
    ).toBe('Tokyo')
  })

  it('should localize every weather scene mode without changing its value', () => {
    expect(getLocalizedWeatherSceneModeOptions({locale: 'en'})).toEqual([
      {label: 'Automatic', value: 'auto'},
      {label: 'Clear', value: 'clear'},
      {label: 'Rain', value: 'rain'},
      {label: 'Snow', value: 'snow'},
      {label: 'Mostly cloudy', value: 'cloudy'},
      {label: 'Overcast', value: 'overcast'},
    ])
  })
})
