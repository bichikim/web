/** @vitest-environment jsdom */
import {cleanup, render} from '@solidjs/testing-library'
import {PWeatherSettings} from 'src/components/p-weather-settings/PWeatherSettings'
import {afterEach, expect, it, vi} from 'vitest'
import {Weather} from '../Weather'
vi.mock('src/components/p-weather-settings/PWeatherSettings', () => ({PWeatherSettings: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should pass weather preferences and change callbacks to the weather controls', () => {
  const onWeatherLocationChange = vi.fn()
  const onWeatherSceneModeChange = vi.fn()
  render(() => (
    <Weather
      onWeatherLocationChange={onWeatherLocationChange}
      onWeatherSceneModeChange={onWeatherSceneModeChange}
      weatherSceneMode="rain"
    />
  ))
  const props = vi.mocked(PWeatherSettings).mock.calls[0]![0]
  expect(props.sceneMode).toBe('rain')
  props.onLocationChange?.({
    country: 'KR',
    id: 'openweather:legacy:jeju',
    name: 'Jeju',
    region: '',
  })
  props.onSceneModeChange?.('snow')
  expect(onWeatherLocationChange).toHaveBeenCalledWith({
    country: 'KR',
    id: 'openweather:legacy:jeju',
    name: 'Jeju',
    region: '',
  })
  expect(onWeatherSceneModeChange).toHaveBeenCalledWith('snow')
})
