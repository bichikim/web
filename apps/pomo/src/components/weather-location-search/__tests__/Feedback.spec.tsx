/** @vitest-environment jsdom */
import * as m from '@paraglide/message'
import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {WeatherLocationSearchFeedback} from '../Feedback'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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
