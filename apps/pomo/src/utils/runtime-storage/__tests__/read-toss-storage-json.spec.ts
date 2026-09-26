/** @vitest-environment jsdom */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
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
  Reflect.deleteProperty(globalThis.window, 'ReactNativeWebView')
  vi.restoreAllMocks()
})

describe('readTossStorageJson', () => {
  it('should load and parse Toss storage on demand', async () => {
    storageMocks.getItem.mockResolvedValue('3')

    await expect(readTossStorageJson('key', parseNumber)).resolves.toBe(3)
    expect(storageMocks.getItem).toHaveBeenCalledWith('key')
  })

  it('should restore existing JSON values and reject invalid stored values', async () => {
    storageMocks.getItem
      .mockResolvedValueOnce('3')
      .mockResolvedValueOnce('"invalid"')
      .mockResolvedValueOnce('{invalid')

    await expect(readTossStorageJson('pomo:setting:v1', parseNumber)).resolves.toBe(3)
    await expect(readTossStorageJson('pomo:setting:v1', parseNumber)).resolves.toBeNull()
    await expect(readTossStorageJson('pomo:setting:v1', parseNumber)).resolves.toBeNull()
    expect(storageMocks.getItem).toHaveBeenCalledWith('pomo:setting:v1')
  })

  it('should treat a parser rejection as an invalid stored value', async () => {
    storageMocks.getItem.mockResolvedValue('3')

    await expect(
      readTossStorageJson('key', () => {
        throw new Error('invalid value')
      }),
    ).resolves.toBeNull()
  })

  it('should propagate Toss storage failures', async () => {
    const failure = new Error('native storage unavailable')
    storageMocks.getItem.mockRejectedValue(failure)

    await expect(readTossStorageJson('key', parseNumber)).rejects.toBe(failure)
  })

  it('should read existing keys containing reserved characters without changing them', async () => {
    storageMocks.getItem.mockResolvedValue('3')

    await expect(readTossStorageJson('pomo:setting?v1', parseNumber)).resolves.toBe(3)
    expect(storageMocks.getItem).toHaveBeenCalledWith('pomo:setting?v1')
  })

  it('should preserve repeated colons in an existing key', async () => {
    storageMocks.getItem.mockResolvedValue('3')

    await expect(readTossStorageJson('pomo::setting:v1', parseNumber)).resolves.toBe(3)
    expect(storageMocks.getItem).toHaveBeenCalledWith('pomo::setting:v1')
  })

  it('should preserve a JSON string even when its content looks like another JSON value', async () => {
    storageMocks.getItem.mockResolvedValue('"true"')

    await expect(
      readTossStorageJson('key', (value) => (typeof value === 'string' ? value : null)),
    ).resolves.toBe('true')
  })
})
