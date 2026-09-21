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
