/** @vitest-environment jsdom */
import {cleanup, render} from '@solidjs/testing-library'
import {PWeatherSettings} from 'src/components/PWeatherSettings'
import {afterEach, expect, it, vi} from 'vitest'
import {Weather} from '../Weather'
vi.mock('src/components/PWeatherSettings', () => ({PWeatherSettings: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should pass weather preferences and change callbacks to the weather controls', () => {
  const onWeatherEnabledChange = vi.fn()
  const onWeatherSceneModeChange = vi.fn()
  render(() => (
    <Weather
      weatherEnabled
      onWeatherEnabledChange={onWeatherEnabledChange}
      onWeatherSceneModeChange={onWeatherSceneModeChange}
      weatherSceneMode="rain"
    />
  ))
  const props = vi.mocked(PWeatherSettings).mock.calls[0]![0]
  expect(props.enabled).toBe(true)
  expect(props.sceneMode).toBe('rain')
  props.onEnabledChange?.(false)
  props.onSceneModeChange?.('snow')
  expect(onWeatherEnabledChange).toHaveBeenCalledWith(false)
  expect(onWeatherSceneModeChange).toHaveBeenCalledWith('snow')
})
