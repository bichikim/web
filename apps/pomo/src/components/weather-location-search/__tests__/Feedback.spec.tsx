/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {WeatherLocationSearchFeedback} from '../Feedback'
const originalGetLocale = getLocale

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  overwriteGetLocale(originalGetLocale)
})

it.each([
  ['input-required', 0, m.weather_location_search_minimum()],
  ['error', 0, m.weather_location_search_error()],
  ['ready', 0, m.weather_location_search_empty()],
] as const)('should explain the %s search state', (status, resultCount, message) => {
  render(() => <WeatherLocationSearchFeedback status={status} resultCount={resultCount} />)
  expect(screen.getByText(message)).toBeVisible()
})
it('should omit feedback when results are available', () => {
  const view = render(() => <WeatherLocationSearchFeedback status="ready" resultCount={1} />)
  expect(view.container).toBeEmptyDOMElement()
})

it.each([
  ['ko', 'searching', '도시 정보 불러오는 중'],
  ['ko', 'ready', '도시가 없습니다'],
  ['en', 'searching', 'Loading city information'],
  ['en', 'ready', 'No cities found'],
] as const)('should show %s %s feedback', (locale, status, message) => {
  overwriteGetLocale(() => locale)
  render(() => <WeatherLocationSearchFeedback status={status} resultCount={0} />)
  expect(screen.getByText(message)).toBeVisible()
})
