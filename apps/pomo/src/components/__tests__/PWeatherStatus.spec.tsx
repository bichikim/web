/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import type {WeatherFeed} from 'src/features/weather'
import {PWeatherStatus} from '../PWeatherStatus'

const createFeed = (overrides: Partial<WeatherFeed['current']> = {}): WeatherFeed => ({
  city: {label: '서울', slug: 'seoul'},
  current: {
    condition: 'clear',
    humidityPercent: 40,
    precipitationMillimeters: null,
    temperatureCelsius: 0,
    ...overrides,
  },
  expiresAt: '2026-08-22T02:00:00.000Z',
  observedAt: '2026-08-22T00:00:00.000Z',
  schemaVersion: 1,
  source: {name: '기상청', url: 'https://www.data.go.kr/data/15084084/openapi.do'},
  stale: false,
  updatedAt: '2026-08-22T00:00:00.000Z',
})

it('should render the city, Korean condition, zero temperature, and icon', () => {
  const originalResult = render(() => (
    <PWeatherStatus state={{feed: createFeed(), status: 'ready'}} />
  ))

  const status = screen.getByRole('status')
  expect(status.textContent).toContain('서울 · 맑음 · 0°')
  expect(status.querySelector('.i-tabler-sun')).not.toBeNull()
  expect(originalResult.container.querySelector('.pomo-weather-status__scribble-border')).toBeNull()
})

it('should draw the shared hand-drawn frame in scribble style', () => {
  const result = render(() => (
    <PWeatherStatus sceneStyle="scribble" state={{feed: createFeed(), status: 'ready'}} />
  ))
  const status = screen.getByRole('status')
  const border = result.container.querySelector('.pomo-weather-status__scribble-border')
  const surface = result.container.querySelector(
    '.pomo-weather-status-frame .pomo-scribble-panel__surface',
  ) as HTMLElement

  expect(border).toBeInstanceOf(SVGElement)
  expect(border?.querySelectorAll('path')).toHaveLength(2)
  expect(surface.classList).toContain('[mask-image:var(--pomo-scribble-panel-mask)]')
  expect(surface.style.getPropertyValue('--pomo-scribble-panel-mask')).toContain(
    'data:image/svg+xml',
  )
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
