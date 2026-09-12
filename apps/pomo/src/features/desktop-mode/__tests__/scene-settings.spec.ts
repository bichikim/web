/** @vitest-environment jsdom */

import {BroadcastChannel as NativeBroadcastChannel} from 'node:worker_threads'
import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {useDesktopSceneSettingsListener, useDesktopSceneSettingsPublisher} from '../scene-settings'
import {LEGACY_WEATHER_LOCATIONS} from '../../weather'

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
  {name: 'weatherLocation', value: LEGACY_WEATHER_LOCATIONS.seoul},
  {name: 'weatherSceneMode', value: 'overcast'},
] as const

beforeEach(() => {
  TestBroadcastChannel.instances = []
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
  vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it.each(['listener', 'publisher'] as const)(
  'should validate and apply every remote setting through the %s',
  (mode) => {
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
      mode === 'listener'
        ? useDesktopSceneSettingsListener(handlers)
        : useDesktopSceneSettingsPublisher({handlers}),
    )
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
    expect(handlers.onWeatherLocationChange).toHaveBeenCalledWith(LEGACY_WEATHER_LOCATIONS.jeju)
    expect(handlers.onWeatherLocationChange).toHaveBeenCalledWith(LEGACY_WEATHER_LOCATIONS.seoul)
    expect(handlers.onWeatherEnabledChange).toHaveBeenCalledWith(true)
    expect(handlers.onWeatherSceneModeChange).toHaveBeenCalledWith('overcast')

    view.cleanup()
    expect(channel?.close).toHaveBeenCalledOnce()
  },
)

it.each(['listener', 'publisher'] as const)(
  'should ignore malformed settings and allow partial handlers through the %s',
  (mode) => {
    const onActivityChange = vi.fn()
    renderHook(() =>
      mode === 'listener'
        ? useDesktopSceneSettingsListener({onActivityChange})
        : useDesktopSceneSettingsPublisher({handlers: {onActivityChange}}),
    )
    const channel = TestBroadcastChannel.instances[0]

    for (const setting of validSettings) {
      channel?.dispatch(setting)
      channel?.dispatch({...setting, value: Symbol('invalid')})
    }
    for (const value of [null, 'invalid', {}, {name: 'activity'}, {name: 'unknown', value: true}]) {
      channel?.dispatch(value)
    }

    expect(channel?.listeners).toHaveLength(1)
    expect(onActivityChange).toHaveBeenCalledExactlyOnceWith('writing')
  },
)

it('should publish settings only in the desktop runtime and release its channel', () => {
  const desktop = renderHook(() => useDesktopSceneSettingsPublisher())
  const channel = TestBroadcastChannel.instances[0]

  desktop.result.publish({name: 'activity', value: 'reading'})
  expect(channel?.postMessage).toHaveBeenCalledWith({name: 'activity', value: 'reading'})
  desktop.cleanup()
  expect(channel?.close).toHaveBeenCalledOnce()
  desktop.result.publish({name: 'activity', value: 'writing'})
  expect(channel?.postMessage).toHaveBeenCalledOnce()

  vi.stubEnv('VITE_POMO_IS_DESKTOP', '')
  const webListener = renderHook(() => useDesktopSceneSettingsListener({}))
  const webPublisher = renderHook(() =>
    useDesktopSceneSettingsPublisher({handlers: {onActivityChange: vi.fn()}}),
  )
  webPublisher.result.publish({name: 'gaze', value: 'focused'})

  expect(TestBroadcastChannel.instances).toHaveLength(1)
  webListener.cleanup()
  webPublisher.cleanup()
})

it('should deliver changes to the other endpoint without replaying them locally', async () => {
  vi.stubGlobal('BroadcastChannel', NativeBroadcastChannel)
  const localChange = vi.fn()
  const remoteChange = vi.fn()
  const local = renderHook(() =>
    useDesktopSceneSettingsPublisher({handlers: {onActivityChange: localChange}}),
  )
  const remote = renderHook(() =>
    useDesktopSceneSettingsPublisher({handlers: {onActivityChange: remoteChange}}),
  )
  try {
    localChange('writing')
    local.result.publish({name: 'activity', value: 'writing'})
    await vi.waitFor(() => expect(remoteChange).toHaveBeenCalledWith('writing'))
    expect(localChange).toHaveBeenCalledTimes(1)
    expect(remoteChange).toHaveBeenCalledTimes(1)

    remoteChange('reading')
    remote.result.publish({name: 'activity', value: 'reading'})
    await vi.waitFor(() => expect(localChange).toHaveBeenLastCalledWith('reading'))
    expect(localChange).toHaveBeenCalledTimes(2)
    expect(remoteChange).toHaveBeenCalledTimes(2)
  } finally {
    local.cleanup()
    remote.cleanup()
  }
})

it('should hydrate each reopened settings endpoint from the current owner motion', async () => {
  vi.stubGlobal('BroadcastChannel', NativeBroadcastChannel)
  let motionMode = 'pan' as 'pan' | 'depth'
  const ownerChange = vi.fn()
  const owner = renderHook(() =>
    useDesktopSceneSettingsPublisher({
      handlers: {onMotionModeChange: ownerChange},
      snapshot: () => [
        {name: 'motionMode', value: motionMode},
        {name: 'motionInput', value: 'drag'},
      ],
    }),
  )
  const checkReopened = async (expected: 'pan' | 'depth') => {
    motionMode = expected
    const onMotionModeChange = vi.fn()
    const onMotionInputChange = vi.fn()
    const surface = renderHook(() =>
      useDesktopSceneSettingsPublisher({
        handlers: {onMotionInputChange, onMotionModeChange},
        requestSnapshot: true,
      }),
    )
    try {
      await vi.waitFor(() => expect(onMotionModeChange).toHaveBeenCalledExactlyOnceWith(expected))
      expect(onMotionInputChange).toHaveBeenCalledExactlyOnceWith('drag')
      expect(ownerChange).not.toHaveBeenCalled()
    } finally {
      surface.cleanup()
    }
  }
  try {
    await checkReopened('pan')
    await checkReopened('depth')
  } finally {
    owner.cleanup()
  }
})
