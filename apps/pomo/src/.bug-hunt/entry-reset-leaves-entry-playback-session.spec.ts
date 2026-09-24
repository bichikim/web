/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {createRuntimeOptionResetManager} from '../features/dev-option-reset'

const storage = vi.hoisted(() => ({getItem: vi.fn(), removeItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: storage}))

const ENTRY_PLAYBACK_SESSION_KEY = 'pomo:focus-room-entry-playback:v1'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.resetAllMocks()
  Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
  storage.getItem.mockResolvedValue(null)
  storage.removeItem.mockResolvedValue(undefined)
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
})

it('should clear entry playback session flag when resetting the entry option group', async () => {
  sessionStorage.setItem(ENTRY_PLAYBACK_SESSION_KEY, 'true')

  await expect(createRuntimeOptionResetManager().reset('entry')).resolves.toEqual({
    status: 'complete',
  })

  expect(sessionStorage.getItem(ENTRY_PLAYBACK_SESSION_KEY)).toBeNull()
})
