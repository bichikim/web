/** @vitest-environment node */

import {describe, expect, it} from 'vitest'

import {
  createVersionedPreferenceRepository,
  type VersionedPreferenceStorage,
} from '../utils/runtime-storage/create-versioned-preference-repository'

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

describe('versioned preference native/web recovery bug hunt', () => {
  it('should prefer a newer recovered web value over stale native after web write failure', async () => {
    let web: Preference | null = null
    let native: Preference | null = null
    const repository = createVersionedPreferenceRepository({
      defaultValue: DEFAULT_PREFERENCE,
      parse: (value) => value,
      storage: createStorage({
        isNative: () => true,
        readNative: async () => native,
        readWeb: () => web,
        writeNative: async (value) => {
          native = value
        },
        writeWeb: () => new Error('browser unavailable'),
      }),
      writeFailureMessage: 'Failed to persist preference.',
    })

    await repository.write({value: 1})
    web = {value: 2}

    await expect(repository.read()).resolves.toEqual({value: 2})
  })
})
