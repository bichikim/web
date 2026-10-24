import {expect, it, vi} from 'vitest'
import {createAuthoritativeWriter} from '..'

it('should require native success despite successful web persistence', async () => {
  const failure = new Error('native unavailable')
  const writeWeb = vi.fn(() => null)
  const write = createAuthoritativeWriter({
    failureMessage: 'save failed',
    isNative: () => true,
    writeNative: async (value: number) => {
      expect(writeWeb).toHaveBeenCalledWith(value)
      throw failure
    },
    writeWeb,
  })
  await expect(write(3)).rejects.toMatchObject({cause: failure, message: 'save failed'})
})

it('should use only web persistence outside native runtime and report its error', async () => {
  const failure = new Error('web unavailable')
  const writeNative = vi.fn(async (_value: number) => undefined)
  const writeWeb = vi.fn((_value: number): unknown | null => null)
  const write = createAuthoritativeWriter({
    failureMessage: 'save failed',
    isNative: () => false,
    writeNative,
    writeWeb,
  })
  await expect(write(1)).resolves.toBeUndefined()
  writeWeb.mockReturnValue(failure)
  await expect(write(2)).rejects.toMatchObject({cause: failure, message: 'save failed'})
  expect(writeNative).not.toHaveBeenCalled()
})

it('should allow callers to preserve native and removal error contracts', async () => {
  const nativeFailure = new Error('native unavailable')
  const removalFailure = new Error('removal unavailable')
  const writeNative = vi.fn(async (_value: number): Promise<void> => {
    throw nativeFailure
  })
  const removeWeb = vi.fn(() => removalFailure)
  const write = createAuthoritativeWriter({
    failureMessage: 'save failed',
    isNative: () => true,
    mapNativeFailure: (error) => error,
    mapRemovalFailure: (error) => new Error('stale copy', {cause: error}),
    removeWeb,
    writeNative,
    writeWeb: () => new Error('web unavailable'),
  })
  await expect(write(1)).rejects.toBe(nativeFailure)
  expect(removeWeb).not.toHaveBeenCalled()
  writeNative.mockResolvedValue(undefined)
  await expect(write(2)).rejects.toMatchObject({cause: removalFailure, message: 'stale copy'})
})
