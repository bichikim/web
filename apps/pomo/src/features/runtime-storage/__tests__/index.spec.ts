/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  createLatestNativeStorageWriter,
  createSerialNativeStorageWriter,
  hasNativeStorageBridge,
  parseStorageJson,
  readNativeStorageJson,
  readWebStorageJson,
  writeWebStorageJson,
} from '..'

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

it('should detect the native bridge without loading storage', () => {
  expect(hasNativeStorageBridge()).toBe(false)
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  expect(hasNativeStorageBridge()).toBe(true)
  expect(storageMocks.getItem).not.toHaveBeenCalled()
})

it('should normalize missing malformed and invalid JSON values', () => {
  expect(parseStorageJson(null, parseNumber)).toBeNull()
  expect(parseStorageJson('{invalid', parseNumber)).toBeNull()
  expect(parseStorageJson('"invalid"', parseNumber)).toBeNull()
  expect(parseStorageJson('3', parseNumber)).toBe(3)
})

it('should normalize browser storage failures', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('read unavailable')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('write unavailable')
  })

  expect(readWebStorageJson('key', parseNumber)).toBeNull()
  expect(writeWebStorageJson('key', 3)).toBeInstanceOf(Error)
})

it('should load and parse native storage on demand', async () => {
  storageMocks.getItem.mockResolvedValue('3')

  await expect(readNativeStorageJson('key', parseNumber)).resolves.toBe(3)
  expect(storageMocks.getItem).toHaveBeenCalledWith('key')
})

it('should preserve serial write order after a failed write', async () => {
  const writer = createSerialNativeStorageWriter()
  const writes: string[] = []
  storageMocks.setItem
    .mockRejectedValueOnce(new Error('temporary failure'))
    .mockImplementation(async (_key, value) => {
      writes.push(value)
    })

  const firstWrite = writer.write('key', 1)
  const secondWrite = writer.write('key', 2)

  await expect(firstWrite).resolves.toBeInstanceOf(Error)
  await expect(secondWrite).resolves.toBeNull()
  expect(writes).toEqual(['2'])
})

it('should repair a native write that finishes after a newer write', async () => {
  const writer = createLatestNativeStorageWriter('key')
  const completions: Array<() => void> = []
  storageMocks.setItem.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        completions.push(resolve)
      }),
  )

  const firstWrite = writer.write(1)
  const secondWrite = writer.write(2)
  await vi.waitFor(() => expect(storageMocks.setItem).toHaveBeenCalledTimes(2))

  completions[1]?.()
  await secondWrite
  completions[0]?.()
  await vi.waitFor(() => expect(storageMocks.setItem).toHaveBeenCalledTimes(3))
  expect(storageMocks.setItem).toHaveBeenLastCalledWith('key', '2')
  completions[2]?.()
  await firstWrite
})
