import {expect, it, vi} from 'vitest'
import {createAuthoritativePreferenceRepository} from '..'

it.each([
  ['available', (): number => 1, 1],
  ['empty', (): null => null, 0],
  [
    'unavailable',
    (): never => {
      throw new Error('web unavailable')
    },
    0,
  ],
] as const)(
  'should use the %s web fallback after a native read fails',
  async (_, readWeb, expected) => {
    const storage = {
      isNative: () => true,
      readNative: vi.fn(async () => {
        throw new Error('native unavailable')
      }),
      readWeb: vi.fn(readWeb),
      writeNative: vi.fn(async (_value: number) => undefined),
      writeWeb: vi.fn((_value: number) => null),
    }
    const repository = createAuthoritativePreferenceRepository<number>({
      defaultValue: 0,
      readFailureMessage: 'read failed',
      softNativeWrite: true,
      storage,
      writeFailureMessage: 'write failed',
    })

    await expect(repository.read()).resolves.toBe(expected)
    expect(storage.readNative).toHaveBeenCalledOnce()
    expect(storage.writeNative).not.toHaveBeenCalled()
    expect(storage.writeWeb).not.toHaveBeenCalled()
  },
)

it('should return a newer browser write when a pending native read fails', async () => {
  const nativeRead = Promise.withResolvers<number | null>()
  let webValue = 1
  const repository = createAuthoritativePreferenceRepository({
    defaultValue: 0,
    readFailureMessage: 'read failed',
    softNativeWrite: true,
    storage: {
      isNative: () => true,
      readNative: () => nativeRead.promise,
      readWeb: () => webValue,
      writeNative: async () => undefined,
      writeWeb: (value) => {
        webValue = value
        return null
      },
    },
    writeFailureMessage: 'write failed',
  })

  const pendingRead = repository.read()
  await repository.write(3)
  nativeRead.reject(new Error('native unavailable'))

  await expect(pendingRead).resolves.toBe(3)
})
