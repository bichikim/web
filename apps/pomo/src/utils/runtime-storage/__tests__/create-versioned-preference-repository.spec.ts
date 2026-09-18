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
})
