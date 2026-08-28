/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {useDesktopSceneSettingsListener, useDesktopSceneSettingsPublisher} from '../scene-settings'

class TestBroadcastChannel {
  static instances: TestBroadcastChannel[] = []
  readonly close = vi.fn()
  readonly listeners: Array<(event: MessageEvent) => void> = []
  readonly postMessage = vi.fn()

  constructor(readonly name: string) {
    TestBroadcastChannel.instances.push(this)
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.push(listener)
  }

  dispatch(data: unknown) {
    for (const listener of this.listeners) {
      listener(new MessageEvent('message', {data}))
    }
  }
}

const validSettings = [
  {name: 'activity', value: 'writing'},
  {name: 'gaze', value: 'user'},
  {name: 'motionInput', value: 'gyroscope'},
  {name: 'motionMode', value: 'pan'},
  {name: 'sceneStyle', value: 'scribble'},
  {name: 'screenSaverDelay', value: '1h'},
  {name: 'timeMode', value: 'night'},
  {name: 'weatherCity', value: 'jeju'},
  {name: 'weatherEnabled', value: true},
] as const

beforeEach(() => {
  TestBroadcastChannel.instances = []
  vi.stubEnv('POMO_IS_DESKTOP', '1')
  vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('should validate and apply every scene setting received from another WebView', () => {
  const handlers = {
    onActivityChange: vi.fn(),
    onGazeChange: vi.fn(),
    onMotionInputChange: vi.fn(),
    onMotionModeChange: vi.fn(),
    onSceneStyleChange: vi.fn(),
    onScreenSaverDelayChange: vi.fn(),
    onTimeModeChange: vi.fn(),
    onWeatherCityChange: vi.fn(),
    onWeatherEnabledChange: vi.fn(),
  }
  const view = renderHook(() => useDesktopSceneSettingsListener(handlers))
  const channel = TestBroadcastChannel.instances[0]

  for (const setting of validSettings) {
    channel?.dispatch(setting)
  }

  expect(handlers.onActivityChange).toHaveBeenCalledWith('writing')
  expect(handlers.onGazeChange).toHaveBeenCalledWith('user')
  expect(handlers.onMotionInputChange).toHaveBeenCalledWith('gyroscope')
  expect(handlers.onMotionModeChange).toHaveBeenCalledWith('pan')
  expect(handlers.onSceneStyleChange).toHaveBeenCalledWith('scribble')
  expect(handlers.onScreenSaverDelayChange).toHaveBeenCalledWith('1h')
  expect(handlers.onTimeModeChange).toHaveBeenCalledWith('night')
  expect(handlers.onWeatherCityChange).toHaveBeenCalledWith('jeju')
  expect(handlers.onWeatherEnabledChange).toHaveBeenCalledWith(true)

  view.cleanup()
  expect(channel?.close).toHaveBeenCalledOnce()
})

it('should ignore malformed settings and tolerate listeners interested in only a subset', () => {
  renderHook(() => useDesktopSceneSettingsListener({}))
  const channel = TestBroadcastChannel.instances[0]

  for (const setting of validSettings) {
    channel?.dispatch(setting)
    channel?.dispatch({...setting, value: Symbol('invalid')})
  }
  for (const value of [null, 'invalid', {}, {name: 'activity'}, {name: 'unknown', value: true}]) {
    channel?.dispatch(value)
  }

  expect(channel?.listeners).toHaveLength(1)
})

it('should publish settings only in the desktop runtime and release its channel', () => {
  const desktop = renderHook(() => useDesktopSceneSettingsPublisher())
  const channel = TestBroadcastChannel.instances[0]

  desktop.result.publish({name: 'activity', value: 'reading'})
  expect(channel?.postMessage).toHaveBeenCalledWith({name: 'activity', value: 'reading'})
  desktop.cleanup()
  expect(channel?.close).toHaveBeenCalledOnce()

  vi.stubEnv('POMO_IS_DESKTOP', '')
  const webListener = renderHook(() => useDesktopSceneSettingsListener({}))
  const webPublisher = renderHook(() => useDesktopSceneSettingsPublisher())
  webPublisher.result.publish({name: 'gaze', value: 'focused'})

  expect(TestBroadcastChannel.instances).toHaveLength(1)
  webListener.cleanup()
  webPublisher.cleanup()
})
