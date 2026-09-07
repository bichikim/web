/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {LEGACY_WEATHER_LOCATIONS, type WeatherSceneMode} from '../../features/weather'
import {PSelect} from '../PSelect'
import {PSwitch} from '../PSwitch'
import {PWeatherLocationSearch} from '../PWeatherLocationSearch'
import {PWeatherSettings} from '../PWeatherSettings'

vi.mock('../PSelect', () => ({
  PSelect: vi.fn((props: Parameters<typeof PSelect>[0]) => {
    Object.values(props)
    return (
      <button
        onClick={() => {
          if (props.multiple) {
            props.onChange(['rain'])
          } else {
            props.onChange('rain')
          }
        }}
        type="button"
      >
        {`${props.value}:${String(props.disabled)}`}
      </button>
    )
  }),
}))
vi.mock('../PWeatherLocationSearch', () => ({
  PWeatherLocationSearch: vi.fn((props: Parameters<typeof PWeatherLocationSearch>[0]) => (
    <button onClick={() => props.onChange?.(LEGACY_WEATHER_LOCATIONS.busan)} type="button">
      {props.location?.id ?? LEGACY_WEATHER_LOCATIONS.seoul.id}
    </button>
  )),
}))
vi.mock('../PSwitch', () => ({
  PSwitch: vi.fn((props: Parameters<typeof PSwitch>[0]) => {
    Object.values(props)
    return (
      <button onClick={() => props.onChange?.(!props.checked)} type="button">
        {String(props.checked)}
      </button>
    )
  }),
}))

afterEach(() => {
  vi.clearAllMocks()
})

it('should use enabled Seoul weather defaults without requiring handlers', () => {
  const view = render(() => <PWeatherSettings />)

  expect(view.container.firstElementChild).toHaveClass('items-start')
  const attribution = screen.getByRole('link', {name: 'Weather data © OpenWeather'})
  expect(attribution).toHaveAttribute('href', 'https://openweathermap.org/')
  expect(attribution.parentElement).toHaveClass('col-span-full')
  fireEvent.click(screen.getByRole('button', {name: 'true'}))
  fireEvent.click(screen.getByRole('button', {name: LEGACY_WEATHER_LOCATIONS.seoul.id}))
  expect(PSelect).toHaveBeenCalledWith(expect.objectContaining({value: 'auto'}))
  expect(PSwitch).toHaveBeenCalledWith(expect.objectContaining({checked: true}))
  expect(PWeatherLocationSearch).toHaveBeenCalledWith(
    expect.objectContaining({location: undefined}),
  )
})

it('should keep city selection enabled and forward explicit setting changes', () => {
  const onLocationChange = vi.fn()
  const onEnabledChange = vi.fn()
  render(() => (
    <PWeatherSettings
      enabled={false}
      location={LEGACY_WEATHER_LOCATIONS.incheon}
      onEnabledChange={onEnabledChange}
      onLocationChange={onLocationChange}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: 'false'}))
  fireEvent.click(screen.getByRole('button', {name: LEGACY_WEATHER_LOCATIONS.incheon.id}))
  expect(onEnabledChange).toHaveBeenCalledWith(true)
  expect(onLocationChange).toHaveBeenCalledWith(LEGACY_WEATHER_LOCATIONS.busan)
})

it('should expose automatic and manual weather scene choices', () => {
  const onSceneModeChange = vi.fn()
  render(() => <PWeatherSettings onSceneModeChange={onSceneModeChange} sceneMode="cloudy" />)

  const weatherSelect = vi
    .mocked(PSelect)
    .mock.calls.map(([props]) => props)
    .find((props) => props.label === '날씨')

  expect(weatherSelect).toMatchObject({
    options: [
      {label: '자동', value: 'auto'},
      {label: '맑음', value: 'clear'},
      {label: '비', value: 'rain'},
      {label: '눈', value: 'snow'},
      {label: '구름 많음', value: 'cloudy'},
      {label: '흐림', value: 'overcast'},
    ],
    value: 'cloudy',
  })

  const onChange = weatherSelect?.onChange as ((mode: WeatherSceneMode) => void) | undefined
  onChange?.('rain')
  expect(onSceneModeChange).toHaveBeenCalledWith('rain')
})
