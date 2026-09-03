import {z} from 'zod'

import {
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeNativeStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'

const STORAGE_KEY = 'pomo:viewed-version-release:v1'
const VERSION_PATTERN = /^\d{4}\. \d{2}\. \d{2} \d{2}:\d{2}$/u

const VIEWED_RELEASE_SCHEMA = z.object({
  formatVersion: z.literal(1),
  releasedAt: z.string().datetime({offset: true}),
  version: z.string().regex(VERSION_PATTERN),
})

export interface ViewedRelease {
  readonly formatVersion: 1
  readonly releasedAt: string
  readonly version: string
}

export interface VersionNoticeStorage {
  readonly isNative: () => boolean
  readonly readNative: () => Promise<unknown | null>
  readonly readWeb: () => unknown | null
  readonly writeNative: (value: ViewedRelease) => Promise<void>
  readonly writeWeb: (value: ViewedRelease) => unknown | null
}

interface CreateViewedReleaseRepositoryOptions {
  readonly storage: VersionNoticeStorage
}

interface ViewedReleaseRepository {
  readonly read: () => Promise<ViewedRelease | null>
  readonly write: (value: ViewedRelease) => Promise<void>
}

const parseViewedRelease = (value: unknown): ViewedRelease | null => {
  const result = VIEWED_RELEASE_SCHEMA.safeParse(value)
  return result.success ? result.data : null
}

export const createViewedReleaseRepository = (
  options: CreateViewedReleaseRepositoryOptions,
): ViewedReleaseRepository => ({
  async read() {
    if (!options.storage.isNative()) {
      return parseViewedRelease(options.storage.readWeb())
    }

    let value: ViewedRelease | null

    try {
      value = parseViewedRelease(await options.storage.readNative())
    } catch (error) {
      throw new Error('Failed to read viewed version release.', {cause: error})
    }

    if (value !== null) {
      try {
        options.storage.writeWeb(value)
      } catch {
        // Browser storage is only a cache when native storage is authoritative.
      }
    }

    return value
  },
  async write(value) {
    const parsedValue = VIEWED_RELEASE_SCHEMA.parse(value)

    if (options.storage.isNative()) {
      try {
        await options.storage.writeNative(parsedValue)
      } catch (error) {
        throw new Error('Failed to persist viewed version release.', {cause: error})
      }

      try {
        options.storage.writeWeb(parsedValue)
      } catch {
        // Browser storage is only a cache when native storage is authoritative.
      }
      return
    }

    let writeError: unknown | null

    try {
      writeError = options.storage.writeWeb(parsedValue)
    } catch (error) {
      writeError = error
    }
    if (writeError !== null) {
      throw new Error('Failed to persist viewed version release.', {cause: writeError})
    }
  },
})

const runtimeStorage: VersionNoticeStorage = {
  isNative: hasNativeStorageBridge,
  readNative: () => readNativeStorageJson(STORAGE_KEY, parseViewedRelease),
  readWeb: () => readWebStorageJson(STORAGE_KEY, parseViewedRelease),
  writeNative: (value) => writeNativeStorageJson(STORAGE_KEY, value),
  writeWeb: (value) => writeWebStorageJson(STORAGE_KEY, value),
}

const repository = createViewedReleaseRepository({storage: runtimeStorage})

export const readViewedRelease = (): Promise<ViewedRelease | null> => repository.read()

export const writeViewedRelease = (value: ViewedRelease): Promise<void> => repository.write(value)
