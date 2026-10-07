import {createTestBroadcastChannel} from 'src/test-utils/create-test-broadcast-channel'
/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {useDesktopSceneSettingsPublisher} from '../../../features/desktop-mode'
import {useDesktopSettingsState} from '../use-settings-state'

const hookMocks = vi.hoisted(() => ({
  supportsPSceneGyroscope: vi.fn(),
  useBackground: vi.fn(),
  useDesktopMode: vi.fn(),
  usePScenePreferences: vi.fn(),
  usePSceneStyle: vi.fn(),
  useScreenSaver: vi.fn(),
  useWeather: vi.fn(),
}))

vi.mock('src/features/background', () => ({useBackground: hookMocks.useBackground}))
vi.mock('../../../features/desktop-mode', async () => {
  const actual: typeof import('../../../features/desktop-mode') = await vi.importActual(
    '../../../features/desktop-mode',
  )

  return {...actual, useDesktopMode: hookMocks.useDesktopMode}
})
vi.mock('../../../features/focus-room-animation', () => ({
  supportsPSceneGyroscope: hookMocks.supportsPSceneGyroscope,
  usePSceneStyle: hookMocks.usePSceneStyle,
}))
vi.mock('../../../features/focus-room-scene-preferences', () => ({
  usePScenePreferences: hookMocks.usePScenePreferences,
}))
vi.mock('../../../features/screen-saver', () => ({useScreenSaver: hookMocks.useScreenSaver}))
vi.mock('../../../features/weather', () => ({useWeather: hookMocks.useWeather}))

const TestBroadcastChannel = createTestBroadcastChannel({broadcast: true, matchName: false})

beforeEach(() => {
  TestBroadcastChannel.instances = []
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
  vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)
  hookMocks.supportsPSceneGyroscope.mockReturnValue(true)
  hookMocks.useBackground.mockReturnValue({})
  hookMocks.useDesktopMode.mockReturnValue({})
  hookMocks.usePScenePreferences.mockReturnValue({
    activity: () => 'writing',
    gaze: () => 'user',
    onActivityChange: vi.fn(),
    onGazeChange: vi.fn(),
    onTimeModeChange: vi.fn(),
    timeMode: () => 'day',
  })
  hookMocks.usePSceneStyle.mockReturnValue({
    onSceneStyleChange: vi.fn(),
    sceneStyle: () => 'classic',
  })
  hookMocks.useScreenSaver.mockReturnValue({delay: () => 'never', onDelayChange: vi.fn()})
  hookMocks.useWeather.mockReturnValue({
    enabled: () => false,
    location: () => ({city: 'seoul', type: 'city'}),
    onEnabledChange: vi.fn(),
    onLocationChange: vi.fn(),
    onSceneModeChange: vi.fn(),
    sceneMode: () => 'overcast',
    state: () => ({type: 'idle'}),
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('should hydrate a reopened settings endpoint from the toolbar motion state', async () => {
  const toolbar = renderHook(() => useDesktopSettingsState())
  toolbar.result.onMotionModeChange('pan')
  toolbar.result.onMotionInputChange('gyroscope')

  const onMotionModeChange = vi.fn()
  const onMotionInputChange = vi.fn()
  const settings = renderHook(() =>
    useDesktopSceneSettingsPublisher({
      handlers: {onMotionInputChange, onMotionModeChange},
      requestSnapshot: true,
    }),
  )

  try {
    await vi.waitFor(() => expect(onMotionModeChange).toHaveBeenCalledExactlyOnceWith('pan'))
    expect(onMotionInputChange).toHaveBeenCalledExactlyOnceWith('gyroscope')
  } finally {
    settings.cleanup()
    toolbar.cleanup()
  }
})
