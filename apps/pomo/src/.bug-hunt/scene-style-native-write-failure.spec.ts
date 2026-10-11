/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {readPSceneStyle, writePSceneStyle} from '../features/focus-room-animation/style-storage'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: storageMocks,
}))

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  localStorage.clear()
  storageMocks.getItem.mockReset()
  storageMocks.setItem.mockReset()
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
  Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
})

describe('scene style native write failure (bug hunt)', () => {
  it('should keep the user choice after native persistence fails', async () => {
    storageMocks.getItem.mockResolvedValue('"original"')
    storageMocks.setItem.mockRejectedValue(new Error('native storage unavailable'))

    await expect(writePSceneStyle('scribble')).resolves.toBeUndefined()
    expect(localStorage.getItem('pomo:focus-room-scene-style:v1')).toBe('"scribble"')

    await expect(readPSceneStyle()).resolves.toBe('scribble')
    expect(localStorage.getItem('pomo:focus-room-scene-style:v1')).toBe('"scribble"')
  })
})
