/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {LEGACY_WEATHER_LOCATIONS, type WeatherSceneMode} from '../../../features/weather'
import {PSelect} from '../../p-select/PSelect'
import {PWeatherLocationSearch} from '../../p-weather-location-search/PWeatherLocationSearch'
import {PWeatherSettings} from '../PWeatherSettings'

vi.mock('../../p-select/PSelect', () => ({
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
vi.mock('../../p-weather-location-search/PWeatherLocationSearch', () => ({
  PWeatherLocationSearch: vi.fn((props: Parameters<typeof PWeatherLocationSearch>[0]) => (
    <button onClick={() => props.onChange?.(LEGACY_WEATHER_LOCATIONS.busan)} type="button">
      {props.location?.id ?? LEGACY_WEATHER_LOCATIONS.seoul.id}
    </button>
  )),
}))
afterEach(() => {
  vi.clearAllMocks()
})

it('should use default weather scene and city search without requiring handlers', () => {
  const view = render(() => <PWeatherSettings />)

  expect(view.container.firstElementChild).toHaveClass('items-start')
  expect(screen.queryByRole('switch', {name: '날씨 표시'})).not.toBeInTheDocument()
  const attribution = screen.getByRole('link', {name: 'Weather data © OpenWeather'})
  expect(attribution).toHaveAttribute('href', 'https://openweathermap.org/')
  expect(attribution.parentElement).toHaveClass('col-span-full')
  fireEvent.click(screen.getByRole('button', {name: LEGACY_WEATHER_LOCATIONS.seoul.id}))
  expect(PSelect).toHaveBeenCalledWith(expect.objectContaining({value: 'auto'}))
  expect(PWeatherLocationSearch).toHaveBeenCalledWith(
    expect.objectContaining({location: undefined}),
  )
})

it('should keep city selection enabled and forward explicit setting changes', () => {
  const onLocationChange = vi.fn()
  render(() => (
    <PWeatherSettings
      location={LEGACY_WEATHER_LOCATIONS.incheon}
      onLocationChange={onLocationChange}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: LEGACY_WEATHER_LOCATIONS.incheon.id}))
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
