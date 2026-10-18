import {createLatestAsyncTask} from '../create-latest-async-task'
import {withPromiseFallback} from '../with-promise-fallback'

export interface VersionedPreferenceStorage<Value> {
  readonly isNative: () => boolean
  readonly readNative: () => Promise<Value | null>
  readonly readWeb: () => Value | null
  /** 성공하면 null을, 실패하면 저장소 오류를 반환한다. */
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

/** 버전이 있는 브라우저·네이티브 설정의 읽기와 쓰기를 조정한다. */
export const createVersionedPreferenceRepository = <Value>(
  options: CreateVersionedPreferenceRepositoryOptions<Value>,
): VersionedPreferenceRepository<Value> => {
  let preferenceWriteRevision = 0
  let prefersNativeSettings = false
  let browserCopyMissing = false
  let pendingNativeSave: Promise<void> | null = null
  const writeLatestNative = createLatestAsyncTask(options.storage.writeNative)

  const read = async (): Promise<Value> => {
    const initialWriteRevision = preferenceWriteRevision

    if (pendingNativeSave !== null) {
      await withPromiseFallback(pendingNativeSave, null)

      if (preferenceWriteRevision !== initialWriteRevision) {
        return read()
      }
    }

    const isNative = options.storage.isNative()
    const webValue = options.storage.readWeb()

    if (webValue !== null && (!isNative || !prefersNativeSettings || browserCopyMissing)) {
      if (isNative) {
        withPromiseFallback(writeLatestNative(webValue), null)
      }

      prefersNativeSettings = false
      browserCopyMissing = false

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

      const latestWebValue = webValue === null ? options.storage.readWeb() : webValue

      if (browserCopyMissing && latestWebValue !== null) {
        prefersNativeSettings = false
        browserCopyMissing = false
        withPromiseFallback(writeLatestNative(latestWebValue), null)
        return latestWebValue
      }

      if (nativeValue === null) {
        return options.defaultValue
      }

      const webWriteError = options.storage.writeWeb(nativeValue)
      prefersNativeSettings = webWriteError !== null
      browserCopyMissing = webWriteError !== null && latestWebValue === null

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
      browserCopyMissing = false
    } else {
      browserCopyMissing = options.storage.readWeb() === null
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
      throw new Error(options.writeFailureMessage, {cause: error})
    } finally {
      if (preferenceWriteRevision === writeRevision) {
        pendingNativeSave = null
      }
    }
  }

  return {read, write}
}
