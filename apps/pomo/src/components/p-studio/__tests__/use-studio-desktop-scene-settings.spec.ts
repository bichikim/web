/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {useDesktopSceneSettingsPublisher} from 'src/features/desktop-mode'
import type {PSceneMotionInput, PSceneMotionMode} from 'src/features/focus-room-animation'
import {useStudioDesktopSceneSettings} from '../use-studio-desktop-scene-settings'

vi.mock('src/features/desktop-mode', () => ({useDesktopSceneSettingsPublisher: vi.fn()}))

it('should apply and publish every local setting while receiving changes without echo', () => {
  const publish = vi.fn()
  vi.mocked(useDesktopSceneSettingsPublisher).mockReturnValue({publish})
  const handlers = {
    onActivityChange: vi.fn(),
    onGazeChange: vi.fn(),
    onMotionInputChange: vi.fn(),
    onMotionModeChange: vi.fn(),
    onSceneStyleChange: vi.fn(),
    onScreenSaverDelayChange: vi.fn(),
    onTimeModeChange: vi.fn(),
    onWeatherEnabledChange: vi.fn(),
    onWeatherLocationChange: vi.fn(),
    onWeatherSceneModeChange: vi.fn(),
  }
  const view = renderHook(() =>
    useStudioDesktopSceneSettings({
      handlers,
      motionInput: () => 'drag',
      motionMode: () => 'depth',
    }),
  )
  const location = {
    country: 'Country',
    id: 'openweather:city' as const,
    name: 'City',
    region: 'Region',
  }
  view.result.onActivityChange('writing')
  view.result.onGazeChange('user')
  view.result.onMotionInputChange('gyroscope')
  view.result.onMotionModeChange('pan')
  view.result.onSceneStyleChange('scribble')
  view.result.onScreenSaverDelayChange('1h')
  view.result.onTimeModeChange('night')
  view.result.onWeatherEnabledChange(true)
  view.result.onWeatherLocationChange(location)
  view.result.onWeatherSceneModeChange('rain')
  expect(publish.mock.calls.map(([setting]) => setting)).toEqual([
    {name: 'activity', value: 'writing'},
    {name: 'gaze', value: 'user'},
    {name: 'motionInput', value: 'gyroscope'},
    {name: 'motionMode', value: 'pan'},
    {name: 'sceneStyle', value: 'scribble'},
    {name: 'screenSaverDelay', value: '1h'},
    {name: 'timeMode', value: 'night'},
    {name: 'weatherEnabled', value: true},
    {name: 'weatherLocation', value: location},
    {name: 'weatherSceneMode', value: 'rain'},
  ])
  expect(handlers.onActivityChange).toHaveBeenCalledExactlyOnceWith('writing')
  expect(handlers.onGazeChange).toHaveBeenCalledExactlyOnceWith('user')
  expect(handlers.onMotionInputChange).toHaveBeenCalledExactlyOnceWith('gyroscope')
  expect(handlers.onMotionModeChange).toHaveBeenCalledExactlyOnceWith('pan')
  expect(handlers.onSceneStyleChange).toHaveBeenCalledExactlyOnceWith('scribble')
  expect(handlers.onScreenSaverDelayChange).toHaveBeenCalledExactlyOnceWith('1h')
  expect(handlers.onTimeModeChange).toHaveBeenCalledExactlyOnceWith('night')
  expect(handlers.onWeatherEnabledChange).toHaveBeenCalledExactlyOnceWith(true)
  expect(handlers.onWeatherLocationChange).toHaveBeenCalledExactlyOnceWith(location)
  expect(handlers.onWeatherSceneModeChange).toHaveBeenCalledExactlyOnceWith('rain')
  const listener = vi.mocked(useDesktopSceneSettingsPublisher).mock.lastCall?.[0]?.handlers
  expect(listener).toBe(handlers)
  publish.mockClear()
  listener?.onMotionInputChange?.('drag')
  listener?.onMotionModeChange?.('depth')
  expect(publish).not.toHaveBeenCalled()
  expect(handlers.onMotionInputChange).toHaveBeenLastCalledWith('drag')
  expect(handlers.onMotionModeChange).toHaveBeenLastCalledWith('depth')
  view.cleanup()
})

it('should read current motion when a snapshot is requested', () => {
  vi.mocked(useDesktopSceneSettingsPublisher).mockReturnValue({publish: vi.fn()})
  const view = renderHook(() => {
    const [motionInput, setMotionInput] = createSignal<PSceneMotionInput>('gyroscope')
    const [motionMode, setMotionMode] = createSignal<PSceneMotionMode>('depth')
    return useStudioDesktopSceneSettings({
      handlers: {
        onActivityChange: vi.fn(),
        onGazeChange: vi.fn(),
        onMotionInputChange: setMotionInput,
        onMotionModeChange: setMotionMode,
        onSceneStyleChange: vi.fn(),
        onScreenSaverDelayChange: vi.fn(),
        onTimeModeChange: vi.fn(),
        onWeatherEnabledChange: vi.fn(),
        onWeatherLocationChange: vi.fn(),
        onWeatherSceneModeChange: vi.fn(),
      },
      motionInput,
      motionMode,
    })
  })
  const snapshot = vi.mocked(useDesktopSceneSettingsPublisher).mock.lastCall?.[0]?.snapshot
  expect(snapshot?.()).toEqual([
    {name: 'motionInput', value: 'gyroscope'},
    {name: 'motionMode', value: 'depth'},
  ])
  view.result.onMotionInputChange('drag')
  view.result.onMotionModeChange('pan')
  expect(snapshot?.()).toEqual([
    {name: 'motionInput', value: 'drag'},
    {name: 'motionMode', value: 'pan'},
  ])
  view.cleanup()
})
