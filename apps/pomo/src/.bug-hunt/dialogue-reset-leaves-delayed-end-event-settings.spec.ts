/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {createRuntimeOptionResetManager} from '../features/dev-option-reset'

const storage = vi.hoisted(() => ({getItem: vi.fn(), removeItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: storage}))

const DELAYED_END_EVENT_SETTINGS_KEY = 'pomo:delayed-end-event-settings:v1'

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

it('should remove delayed end event settings when resetting the dialogue option group', async () => {
  localStorage.setItem(
    DELAYED_END_EVENT_SETTINGS_KEY,
    JSON.stringify({durationMinutes: 5, version: 1}),
  )

  await expect(createRuntimeOptionResetManager().reset('dialogue')).resolves.toEqual({
    status: 'complete',
  })

  expect(localStorage.getItem(DELAYED_END_EVENT_SETTINGS_KEY)).toBeNull()
})
