/** @vitest-environment node */

import {describe, expect, it, vi} from 'vitest'

import {
  createVersionedPreferenceRepository,
  type VersionedPreferenceStorage,
} from '../create-versioned-preference-repository'

interface Preference {
  readonly value: number
}

const DEFAULT_PREFERENCE = {value: 0} satisfies Preference

const createStorage = (
  overrides: Partial<VersionedPreferenceStorage<Preference>> = {},
): VersionedPreferenceStorage<Preference> => ({
  isNative: () => false,
  readNative: async () => null,
  readWeb: () => null,
  writeNative: async () => undefined,
  writeWeb: () => null,
  ...overrides,
})

const createRepository = (storage: VersionedPreferenceStorage<Preference>) =>
  createVersionedPreferenceRepository({
    defaultValue: DEFAULT_PREFERENCE,
    parse: (value) => value,
    storage,
    writeFailureMessage: 'Failed to persist preference.',
  })

describe('createVersionedPreferenceRepository', () => {
  it('should read the default and persist a validated browser value', async () => {
    let stored: Preference | null = null
    const writeWeb = vi.fn((value: Preference) => {
      stored = value
      return null
    })
    const repository = createRepository(createStorage({readWeb: () => stored, writeWeb}))

    await expect(repository.read()).resolves.toEqual(DEFAULT_PREFERENCE)
    await repository.write({value: 4})

    expect(writeWeb).toHaveBeenCalledWith({value: 4})
    await expect(repository.read()).resolves.toEqual({value: 4})
  })

  it('should preserve a newer browser write while a native read is pending', async () => {
    const nativeRead = Promise.withResolvers<Preference | null>()
    let stored: Preference | null = null
    const repository = createRepository(
      createStorage({
        isNative: () => true,
        readNative: () => nativeRead.promise,
        readWeb: () => stored,
        writeWeb: (value) => {
          stored = value
          return null
        },
      }),
    )

    const pendingRead = repository.read()
    await repository.write({value: 8})
    nativeRead.resolve({value: 2})

    await expect(pendingRead).resolves.toEqual({value: 8})
  })

  it('should use a recovered browser value after falling back to native storage', async () => {
    let nativeValue: Preference | null = null
    let webValue: Preference | null = null
    const repository = createRepository(
      createStorage({
        isNative: () => true,
        readNative: async () => nativeValue,
        readWeb: () => webValue,
        writeNative: async (value) => {
          nativeValue = value
        },
        writeWeb: () => new Error('browser unavailable'),
      }),
    )

    await repository.write({value: 1})
    webValue = {value: 2}

    await expect(repository.read()).resolves.toEqual({value: 2})
    expect(nativeValue).toEqual({value: 2})
  })

  it('should preserve native storage when the browser copy is stale and unavailable', async () => {
    let nativeValue: Preference | null = {value: 0}
    const webValue = {value: 0} satisfies Preference
    const repository = createRepository(
      createStorage({
        isNative: () => true,
        readNative: async () => nativeValue,
        readWeb: () => webValue,
        writeNative: async (value) => {
          nativeValue = value
        },
        writeWeb: () => new Error('browser unavailable'),
      }),
    )

    await repository.write({value: 1})

    await expect(repository.read()).resolves.toEqual({value: 1})
    expect(nativeValue).toEqual({value: 1})
  })

  it('should read browser storage after the native bridge disappears', async () => {
    let isNative = true
    let webValue: Preference | null = null
    const repository = createRepository(
      createStorage({
        isNative: () => isNative,
        readNative: async () => ({value: 1}),
        readWeb: () => webValue,
        writeNative: async () => undefined,
        writeWeb: () => new Error('browser unavailable'),
      }),
    )

    await repository.write({value: 1})
    webValue = {value: 2}
    isNative = false

    await expect(repository.read()).resolves.toEqual({value: 2})
  })

  it('should use a browser value recovered while the native read is pending', async () => {
    const nativeRead = Promise.withResolvers<Preference | null>()
    let nativeValue: Preference | null = {value: 1}
    let webValue: Preference | null = null
    const repository = createRepository(
      createStorage({
        isNative: () => true,
        readNative: () => nativeRead.promise,
        readWeb: () => webValue,
        writeNative: async (value) => {
          nativeValue = value
        },
        writeWeb: () => new Error('browser unavailable'),
      }),
    )

    await repository.write({value: 1})
    const pendingRead = repository.read()
    webValue = {value: 2}
    nativeRead.resolve(nativeValue)

    await expect(pendingRead).resolves.toEqual({value: 2})
    expect(nativeValue).toEqual({value: 2})
  })

  it('should translate a failed browser and native write', async () => {
    const repository = createRepository(
      createStorage({
        isNative: () => true,
        writeNative: async () => {
          throw new Error('native unavailable')
        },
        writeWeb: () => new Error('browser unavailable'),
      }),
    )

    await expect(repository.write({value: 3})).rejects.toThrow('Failed to persist preference.')
  })

  it('should translate a failed native write after a successful browser write', () => {
    const nativeError = new Error('native unavailable')
    const writeNative = vi.fn(async () => {
      throw nativeError
    })
    const writeWeb = vi.fn(() => null)
    const repository = createRepository(
      createStorage({
        isNative: () => true,
        writeNative,
        writeWeb,
      }),
    )

    const rejection = expect(repository.write({value: 4})).rejects.toMatchObject({
      cause: nativeError,
      message: 'Failed to persist preference.',
    })
    expect(writeWeb).toHaveBeenCalledWith({value: 4})
    expect(writeNative).toHaveBeenCalledWith({value: 4})

    return rejection
  })
})
