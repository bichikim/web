/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {toolStorageAdapter} from '../storage-adapter'

const native = vi.hoisted(() => ({getItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: native}))
afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})
const parseString = (value: unknown) => (typeof value === 'string' ? value : null)
it('should write parse and remove browser values through the runtime adapter', () => {
  expect(toolStorageAdapter.usesTossStorage()).toBe(false)
  expect(toolStorageAdapter.writeWeb('selection', 'lunar')).toBeNull()
  expect(toolStorageAdapter.readWeb('selection', parseString)).toBe('lunar')
  expect(toolStorageAdapter.removeWeb('selection')).toBeNull()
  expect(toolStorageAdapter.readWeb('selection', parseString)).toBeNull()
})
it('should serialize and parse native values through the SDK boundary', async () => {
  vi.stubGlobal('ReactNativeWebView', {})
  native.getItem.mockResolvedValue('"lunar"')
  expect(toolStorageAdapter.usesTossStorage()).toBe(true)
  await toolStorageAdapter.writeToss('selection', 'lunar')
  expect(native.setItem).toHaveBeenCalledWith('selection', '"lunar"')
  await expect(toolStorageAdapter.readToss('selection', parseString)).resolves.toBe('lunar')
})
