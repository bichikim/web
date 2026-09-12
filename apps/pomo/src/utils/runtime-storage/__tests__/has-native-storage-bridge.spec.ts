/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {hasNativeStorageBridge} from '../has-native-storage-bridge'
const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({Storage: storageMocks}))

beforeEach(() => {
  localStorage.clear()
  storageMocks.getItem.mockReset()
  storageMocks.setItem.mockReset()
})
afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
  vi.restoreAllMocks()
})
it('should detect the native bridge without loading storage', () => {
  expect(hasNativeStorageBridge()).toBe(false)
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  expect(hasNativeStorageBridge()).toBe(true)
  expect(storageMocks.getItem).not.toHaveBeenCalled()
})
