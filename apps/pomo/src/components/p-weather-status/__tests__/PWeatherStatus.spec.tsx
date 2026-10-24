/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {LEGACY_WEATHER_LOCATIONS, type WeatherFeed} from 'src/features/weather'
import {PWeatherStatus} from '../PWeatherStatus'

const createFeed = (overrides: Partial<WeatherFeed['current']> = {}): WeatherFeed => ({
  current: {
    condition: 'clear',
    humidityPercent: 40,
    precipitationMillimeters: null,
    temperatureCelsius: 0,
    ...overrides,
  },
  expiresAt: '2026-08-22T02:00:00.000Z',
  location: LEGACY_WEATHER_LOCATIONS.seoul,
  observedAt: '2026-08-22T00:00:00.000Z',
  schemaVersion: 2,
  source: {name: 'OpenWeather', url: 'https://openweathermap.org/'},
  stale: false,
  updatedAt: '2026-08-22T00:00:00.000Z',
})

it('should render the city, Korean condition, zero temperature, and icon', () => {
  render(() => <PWeatherStatus state={{feed: createFeed(), status: 'ready'}} />)

  const status = screen.getByRole('status')
  expect(status.textContent).toContain('서울 · 맑음 · 0°')
  expect(status).toHaveClass('text-sm')
  expect(status.querySelector('span[aria-hidden="true"]')).toHaveClass('i-tabler-sun', 'size-4.5')
  expect(status.parentElement?.parentElement?.querySelector('svg')).toBeNull()
})

it('should draw the shared hand-drawn frame in scribble style', () => {
  render(() => (
    <PWeatherStatus sceneStyle="scribble" state={{feed: createFeed(), status: 'ready'}} />
  ))
  const status = screen.getByRole('status')
  const surface = status.parentElement as HTMLElement
  const frame = surface.parentElement as HTMLElement
  const border = frame.querySelector('svg')

  expect(border).toBeInstanceOf(SVGElement)
  expect(border?.querySelectorAll('path')).toHaveLength(2)
  expect(surface.classList).toContain('pomo-scribble-mask')
  expect(surface).not.toHaveAttribute('style')
  expect(surface.contains(border)).toBe(false)
  expect(status.classList).toContain('rounded-none')
  expect(status.classList).toContain('border-0')
})

it('should disclose stale weather data', () => {
  render(() => <PWeatherStatus state={{feed: {...createFeed(), stale: true}, status: 'ready'}} />)

  expect(screen.getByRole('status').textContent).toContain('업데이트 지연')
})

it('should not render a status when weather is disabled', () => {
  render(() => <PWeatherStatus state={{status: 'disabled'}} />)

  expect(screen.queryByRole('status')).toBeNull()
})

it('should show loading and error states for the selected city', () => {
  const {unmount} = render(() => (
    <PWeatherStatus state={{location: LEGACY_WEATHER_LOCATIONS.busan, status: 'loading'}} />
  ))
  expect(screen.getByRole('status').textContent).toContain('부산')
  expect(screen.getByRole('status').querySelector('span[aria-hidden="true"]')).toHaveClass(
    'i-tabler-loader-2',
    'size-4.5',
  )
  unmount()
  render(() => (
    <PWeatherStatus state={{location: LEGACY_WEATHER_LOCATIONS.jeju, status: 'error'}} />
  ))
  expect(screen.getByRole('status').textContent).toContain('제주')
  expect(screen.getByRole('status').querySelector('span[aria-hidden="true"]')).toHaveClass(
    'i-tabler-cloud-off',
    'size-4.5',
  )
})

it('should omit temperature when the feed has no measured temperature', () => {
  render(() => (
    <PWeatherStatus state={{feed: createFeed({temperatureCelsius: null}), status: 'ready'}} />
  ))
  expect(screen.getByRole('status').textContent).toContain('서울 · 맑음')
  expect(screen.getByRole('status').textContent).not.toContain('°')
})
