/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'
import {createOpfsPartialDownloadStorage} from '../storage'

const createAccess = () => ({
  close: vi.fn(),
  flush: vi.fn(),
  getSize: vi.fn(() => 4),
  write: vi.fn((bytes: Uint8Array) => bytes.byteLength),
})
const createStorage = (access: ReturnType<typeof createAccess>) => {
  const handle = {
    createSyncAccessHandle: vi.fn(async () => access),
    createWritable: vi.fn(),
    getFile: vi.fn(),
  }
  const directory = {getFileHandle: vi.fn(async () => handle)}
  vi.stubGlobal('navigator', {
    storage: {getDirectory: async () => ({getDirectoryHandle: async () => directory})},
  })
  return {handle, storage: createOpfsPartialDownloadStorage()}
}

afterEach(() => vi.unstubAllGlobals())

it('should append and flush new bytes without copying the existing partial file', async () => {
  const access = createAccess()
  const {handle, storage} = createStorage(access)
  const chunk = new TextEncoder().encode('next')
  await storage?.append('https://models.test/weights', chunk)
  expect(access.write).toHaveBeenCalledWith(chunk, {at: 4})
  expect(access.flush).toHaveBeenCalledOnce()
  expect(access.close).toHaveBeenCalledOnce()
  expect(handle.getFile).not.toHaveBeenCalled()
  expect(handle.createWritable).not.toHaveBeenCalled()
})

it('should finish partial writes at the next file offset', async () => {
  const access = createAccess()
  access.write.mockReturnValueOnce(2)
  const {storage} = createStorage(access)
  const chunk = new TextEncoder().encode('next')
  await storage?.append('https://models.test/weights', chunk)
  expect(access.write).toHaveBeenNthCalledWith(2, chunk.subarray(2), {at: 6})
  expect(access.flush).toHaveBeenCalledOnce()
})

it.each(['write', 'flush'] as const)(
  'should close the file lock and preserve a %s error',
  async (operation) => {
    const access = createAccess()
    const error = new Error(operation)
    access[operation].mockImplementation(() => {
      throw error
    })
    const {storage} = createStorage(access)
    await expect(storage?.append('https://models.test/weights', new Uint8Array([1]))).rejects.toBe(
      error,
    )
    expect(access.close).toHaveBeenCalledOnce()
  },
)

it('should reject a zero-byte write instead of looping forever', async () => {
  const access = createAccess()
  access.write.mockReturnValue(0)
  const {storage} = createStorage(access)
  await expect(storage?.append('https://models.test/weights', new Uint8Array([1]))).rejects.toThrow(
    'write',
  )
  expect(access.close).toHaveBeenCalledOnce()
})
