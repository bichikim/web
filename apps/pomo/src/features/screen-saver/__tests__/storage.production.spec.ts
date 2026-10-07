/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {createTestBroadcastChannel} from 'src/test-utils/create-test-broadcast-channel'
import {useDesktopSceneSettingsListener} from '../../desktop-mode/scene-settings'

const TestBroadcastChannel = createTestBroadcastChannel()

afterEach(() => {
  TestBroadcastChannel.instances = []
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

it('should reject a production-only unsupported screen saver delay across storage and desktop sync', async () => {
  vi.stubEnv('DEV', false)
  vi.stubEnv('VITE_POMO_IS_DESKTOP', 'true')
  vi.stubEnv('VITE_POMO_PUBLIC_ORIGIN', 'https://example.test')
  vi.stubGlobal('BroadcastChannel', TestBroadcastChannel)
  vi.resetModules()

  const {readScreenSaverDelay, SCREEN_SAVER_STORAGE_KEY} = await import('../storage')

  localStorage.setItem(
    SCREEN_SAVER_STORAGE_KEY,
    JSON.stringify({delay: '5s', savedAt: 1_700_000_000_000}),
  )
  await expect(readScreenSaverDelay()).resolves.toBe('10m')

  const onScreenSaverDelayChange = vi.fn()
  const listener = renderHook(() => useDesktopSceneSettingsListener({onScreenSaverDelayChange}))
  const channel = TestBroadcastChannel.instances[0]

  try {
    expect(channel).toBeDefined()
    channel?.dispatch({name: 'screenSaverDelay', value: '5s'})
    expect(onScreenSaverDelayChange).not.toHaveBeenCalled()

    channel?.dispatch({name: 'screenSaverDelay', value: '1h'})
    expect(onScreenSaverDelayChange).toHaveBeenCalledExactlyOnceWith('1h')
  } finally {
    listener.cleanup()
  }
})
