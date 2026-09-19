import {createLatestAsyncTask} from '../create-latest-async-task'
import {withPromiseNull} from '../with-promise-null'

export interface VersionedPreferenceStorage<Value> {
  readonly isNative: () => boolean
  readonly readNative: () => Promise<Value | null>
  readonly readWeb: () => Value | null
  /** Returns null on success, or the storage error on failure. */
  readonly writeWeb: (value: Value) => unknown | null
  readonly writeNative: (value: Value) => Promise<void>
}

export interface VersionedPreferenceRepository<Value> {
  readonly read: () => Promise<Value>
  readonly write: (value: Value) => Promise<void>
}

export interface CreateVersionedPreferenceRepositoryOptions<Value> {
  readonly defaultValue: Value
  readonly parse: (value: Value) => Value
  readonly storage: VersionedPreferenceStorage<Value>
  readonly writeFailureMessage: string
}

/** Coordinates versioned browser and native preference reads and writes. */
export const createVersionedPreferenceRepository = <Value>(
  options: CreateVersionedPreferenceRepositoryOptions<Value>,
): VersionedPreferenceRepository<Value> => {
  let preferenceWriteRevision = 0
  let prefersNativeSettings = false
  let pendingNativeSave: Promise<void> | null = null
  const writeLatestNative = createLatestAsyncTask(options.storage.writeNative)

  const read = async (): Promise<Value> => {
    const initialWriteRevision = preferenceWriteRevision

    if (pendingNativeSave !== null) {
      await withPromiseNull(pendingNativeSave)

      if (preferenceWriteRevision !== initialWriteRevision) {
        return read()
      }
    }

    const isNative = options.storage.isNative()
    const webValue = options.storage.readWeb()

    if (webValue !== null && !prefersNativeSettings) {
      if (isNative) {
        withPromiseNull(writeLatestNative(webValue))
      }

      return webValue
    }

    if (!isNative) {
      return options.defaultValue
    }

    try {
      const nativeValue = await options.storage.readNative()

      if (preferenceWriteRevision !== initialWriteRevision) {
        return read()
      }

      if (nativeValue === null) {
        return options.defaultValue
      }

      const webWriteError = options.storage.writeWeb(nativeValue)
      prefersNativeSettings = webWriteError !== null

      if (webWriteError !== null && webValue !== null) {
        withPromiseNull(writeLatestNative(webValue))
        return webValue
      }

      return nativeValue
    } catch {
      if (preferenceWriteRevision !== initialWriteRevision) {
        return read()
      }

      return options.storage.readWeb() ?? options.defaultValue
    }
  }

  const write = async (value: Value): Promise<void> => {
    const snapshot = options.parse(value)
    preferenceWriteRevision += 1
    const writeRevision = preferenceWriteRevision
    const webWriteError = options.storage.writeWeb(snapshot)

    if (webWriteError === null) {
      prefersNativeSettings = false
    }

    if (!options.storage.isNative()) {
      if (webWriteError !== null) {
        throw new Error(options.writeFailureMessage, {cause: webWriteError})
      }

      return
    }

    const nativeWrite = writeLatestNative(snapshot)

    if (webWriteError !== null) {
      pendingNativeSave = nativeWrite
    }

    try {
      await nativeWrite

      if (preferenceWriteRevision === writeRevision && webWriteError !== null) {
        prefersNativeSettings = true
      }
    } catch (error: unknown) {
      if (webWriteError !== null) {
        throw new Error(options.writeFailureMessage, {cause: error})
      }
    } finally {
      if (preferenceWriteRevision === writeRevision) {
        pendingNativeSave = null
      }
    }
  }

  return {read, write}
}
