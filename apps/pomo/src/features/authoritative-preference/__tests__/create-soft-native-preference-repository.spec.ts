import {expect, it, vi} from 'vitest'
import {createSoftNativePreferenceRepository} from '../create-soft-native-preference-repository'

const createRepository = (marker: 'write-throws' | 'read-throws' | 'absent') => {
  let webValue = 1
  let nativeValue = 1
  const readNative = vi.fn(async () => nativeValue)
  const writeNative = vi.fn(async (value: number) => {
    nativeValue = value
  })
  const repository = createSoftNativePreferenceRepository({
    defaultValue: 0,
    nativeWriteFailure:
      marker === 'absent'
        ? undefined
        : {
            read: () => {
              if (marker === 'read-throws') {
                throw new Error('marker read failed')
              }
              return false
            },
            write: () => {
              if (marker === 'write-throws') {
                throw new Error('marker write failed')
              }
            },
          },
    readFailureMessage: 'read failed',
    storage: {
      isNative: () => true,
      readNative,
      readWeb: () => webValue,
      writeNative,
      writeWeb: (value: number) => {
        webValue = value
        return null
      },
    },
    writeFailureMessage: 'write failed',
  })
  return {readNative, readWeb: () => webValue, repository, writeNative}
}

it.each(['write-throws', 'read-throws', 'absent'] as const)(
  'should preserve browser edits after a native write fails with a %s marker',
  async (marker) => {
    const {repository, readNative, writeNative, readWeb} = createRepository(marker)
    await expect(repository.read()).resolves.toBe(1)
    writeNative.mockRejectedValueOnce(new Error('native unavailable'))

    await expect(repository.write(2)).resolves.toBeUndefined()
    expect(readWeb()).toBe(2)
    await expect(repository.read()).resolves.toBe(2)
    await expect(repository.read()).resolves.toBe(2)
    expect(readWeb()).toBe(2)
    expect(readNative).toHaveBeenCalledOnce()
  },
)

it('should resume native reads after a successful retry despite marker write errors', async () => {
  const {repository, readNative, writeNative, readWeb} = createRepository('write-throws')
  writeNative.mockRejectedValueOnce(new Error('native unavailable'))
  await repository.write(2)
  await repository.write(3)
  readNative.mockResolvedValueOnce(4)

  await expect(repository.read()).resolves.toBe(4)
  expect(readWeb()).toBe(4)
  expect(readNative).toHaveBeenCalledOnce()
})

it('should preserve the latest failure when an older native write succeeds later', async () => {
  const {repository, writeNative, readWeb} = createRepository('write-throws')
  const olderWrite = Promise.withResolvers<void>()
  writeNative.mockReturnValueOnce(olderWrite.promise)
  writeNative.mockRejectedValueOnce(new Error('native unavailable'))
  const pendingWrite = repository.write(2)
  await repository.write(3)
  olderWrite.resolve()
  await pendingWrite

  await expect(repository.read()).resolves.toBe(3)
  expect(readWeb()).toBe(3)
})

it('should preserve recovery when an older native write fails later', async () => {
  const {repository, readNative, writeNative, readWeb} = createRepository('write-throws')
  const olderWrite = Promise.withResolvers<void>()
  writeNative.mockReturnValueOnce(olderWrite.promise)
  const pendingWrite = repository.write(2)
  await repository.write(3)
  olderWrite.reject(new Error('native unavailable'))
  await pendingWrite
  readNative.mockResolvedValueOnce(4)

  await expect(repository.read()).resolves.toBe(4)
  expect(readWeb()).toBe(4)
})
