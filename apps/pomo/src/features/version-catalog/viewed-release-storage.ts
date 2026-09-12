import {z} from 'zod'

import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

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
  readonly usesTossStorage: () => boolean
  readonly readToss: () => Promise<unknown | null>
  readonly readWeb: () => unknown | null
  readonly writeToss: (value: ViewedRelease) => Promise<void>
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
): ViewedReleaseRepository => {
  let writeQueue = Promise.resolve()

  return {
    async read() {
      if (!options.storage.usesTossStorage()) {
        return parseViewedRelease(options.storage.readWeb())
      }

      let value: ViewedRelease | null

      try {
        value = parseViewedRelease(await options.storage.readToss())
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

      if (options.storage.usesTossStorage()) {
        const write = writeQueue.then(async () => {
          let storedValue: ViewedRelease
          try {
            const currentValue = parseViewedRelease(await options.storage.readToss())
            storedValue =
              currentValue !== null &&
              Date.parse(currentValue.releasedAt) >= Date.parse(parsedValue.releasedAt)
                ? currentValue
                : parsedValue
            if (storedValue === parsedValue) {
              await options.storage.writeToss(storedValue)
            }
          } catch (error) {
            throw new Error('Failed to persist viewed version release.', {cause: error})
          }

          try {
            options.storage.writeWeb(storedValue)
          } catch {
            // Browser storage is only a cache when native storage is authoritative.
          }
        })
        // A failed write must not block later attempts; its caller still receives the rejection.
        writeQueue = write.catch(() => undefined)
        return write
      }

      let writeError: unknown | null

      try {
        const currentValue = parseViewedRelease(options.storage.readWeb())
        if (
          currentValue !== null &&
          Date.parse(currentValue.releasedAt) >= Date.parse(parsedValue.releasedAt)
        ) {
          return
        }

        writeError = options.storage.writeWeb(parsedValue)
      } catch (error) {
        writeError = error
      }
      if (writeError !== null) {
        throw new Error('Failed to persist viewed version release.', {cause: writeError})
      }
    },
  }
}

const runtimeStorage: VersionNoticeStorage = {
  readToss: () => readTossStorageJson(STORAGE_KEY, parseViewedRelease),
  readWeb: () => readWebStorageJson(STORAGE_KEY, parseViewedRelease),
  usesTossStorage: hasNativeStorageBridge,
  writeToss: (value) => writeTossStorageJson(STORAGE_KEY, value),
  writeWeb: (value) => writeWebStorageJson(STORAGE_KEY, value),
}

const repository = createViewedReleaseRepository({storage: runtimeStorage})

export const readViewedRelease = (): Promise<ViewedRelease | null> => repository.read()

export const writeViewedRelease = (value: ViewedRelease): Promise<void> => repository.write(value)
