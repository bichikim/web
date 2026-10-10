/** @vitest-environment jsdom */

import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {useScreenSaver} from 'src/features/screen-saver/use-screen-saver'
import {SCREEN_SAVER_STORAGE_KEY, writeScreenSaverDelay} from 'src/features/screen-saver/storage'
import {PreferenceProvider} from 'src/hooks/use-preference'

vi.mock('src/utils/get-monotonic-time', () => ({getMonotonicTime: () => Date.now()}))
vi.mock('src/utils/runtime-storage/has-native-storage-bridge', () => ({
  hasNativeStorageBridge: () => false,
}))
vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
  },
}))

beforeEach(() => {
  globalThis.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

it('should refresh the screen saver delay when another tab updates the preference key', async () => {
  const {result} = renderHook(() => useScreenSaver(), {wrapper: PreferenceProvider})

  await waitFor(() => expect(result.delay()).toBe('10m'))

  await writeScreenSaverDelay('1h')
  globalThis.dispatchEvent(new StorageEvent('storage', {key: SCREEN_SAVER_STORAGE_KEY}))

  await waitFor(() => expect(result.delay()).toBe('1h'))
})
