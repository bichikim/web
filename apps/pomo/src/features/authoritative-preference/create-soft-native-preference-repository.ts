import type {CreateAuthoritativePreferenceRepositoryOptions} from './index'
/** Preserves browser edits while native writes are pending or fail. */
export const createSoftNativePreferenceRepository = <Value>(
  options: CreateAuthoritativePreferenceRepositoryOptions<Value>,
) => {
  const {storage} = options
  let writeRevision = 0
  let pendingNativeWriteCount = 0
  const readWebPreferences = () => storage.readWeb()
  const writeWebPreferences = (preferences: Value) => storage.writeWeb(preferences)
  const readAvailableWebPreferences = () => {
    try {
      return readWebPreferences()
    } catch {
      return null
    }
  }
  const readNativeWriteFailure = () => {
    try {
      return options.nativeWriteFailure?.read() === true
    } catch {
      return false
    }
  }
  const setNativeWriteFailure = (failed: boolean) => {
    try {
      options.nativeWriteFailure?.write(failed)
    } catch {}
  }

  const read = async (): Promise<Value> => {
    const initialWriteRevision = writeRevision

    if (!storage.isNative()) {
      return readWebPreferences() ?? options.defaultValue
    }

    if (pendingNativeWriteCount > 0) {
      return readAvailableWebPreferences() ?? options.defaultValue
    }

    const webPreferences = readAvailableWebPreferences()
    if (webPreferences !== null && readNativeWriteFailure()) {
      return webPreferences
    }

    try {
      const storedPreferences = await storage.readNative()
      if (writeRevision !== initialWriteRevision) {
        return readAvailableWebPreferences() ?? options.defaultValue
      }

      const tossPreferences = storedPreferences

      const latestWebPreferences = readAvailableWebPreferences()
      if (latestWebPreferences !== null && readNativeWriteFailure()) {
        return latestWebPreferences
      }

      const restoredPreferences = tossPreferences ?? latestWebPreferences ?? options.defaultValue
      if (tossPreferences !== null) {
        setNativeWriteFailure(false)
      }
      writeWebPreferences(restoredPreferences)
      return restoredPreferences
    } catch {
      if (writeRevision !== initialWriteRevision) {
        return readAvailableWebPreferences() ?? options.defaultValue
      }

      return readWebPreferences() ?? options.defaultValue
    }
  }

  const write = async (preferences: Value): Promise<void> => {
    const webWriteError = writeWebPreferences(preferences)
    writeRevision += 1
    const currentWriteRevision = writeRevision
    const isNative = storage.isNative()
    if (!isNative) {
      if (webWriteError !== null) {
        throw new Error(options.writeFailureMessage, {cause: webWriteError})
      }
      setNativeWriteFailure(false)
      return
    }

    pendingNativeWriteCount += 1
    try {
      await storage.writeNative(preferences)
      if (writeRevision === currentWriteRevision) {
        setNativeWriteFailure(false)
      }
    } catch {
      if (writeRevision === currentWriteRevision) {
        setNativeWriteFailure(true)
      }
    } finally {
      pendingNativeWriteCount -= 1
    }
  }

  return {read, write}
}
