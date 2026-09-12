/** @vitest-environment jsdom */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {readTossStorageJson} from '../read-toss-storage-json'
const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({Storage: storageMocks}))

const parseNumber = (value: unknown) => (typeof value === 'number' ? value : null)
beforeEach(() => {
  localStorage.clear()
  storageMocks.getItem.mockReset()
  storageMocks.setItem.mockReset()
})
afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
  vi.restoreAllMocks()
})
it('should load and parse Toss storage on demand', async () => {
  storageMocks.getItem.mockResolvedValue('3')

  await expect(readTossStorageJson('key', parseNumber)).resolves.toBe(3)
  expect(storageMocks.getItem).toHaveBeenCalledWith('key')
})
