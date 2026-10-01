import {createLatestStorageWriter} from './create-latest-storage-writer'
import {createTimestampedDualRuntimeStorage} from './create-timestamped-dual-runtime-storage'

export interface TimestampedPreferenceStorage {
  readonly usesTossStorage: () => boolean
  readonly readToss: (key: string) => Promise<unknown>
  readonly readWeb: (key: string) => unknown
  readonly writeToss: (key: string, value: unknown) => Promise<void>
  readonly writeWeb: (key: string, value: unknown) => unknown | null
  readonly removeWeb: (key: string) => unknown | null
}
export interface TimestampedPreferenceRepositoryOptions<
  Stored extends {readonly savedAt: number},
  Value,
> {
  readonly key: string
  readonly storage: TimestampedPreferenceStorage
  readonly now: () => number
  readonly parseStored: (value: unknown) => Stored | null
  readonly toValue: (value: Stored) => Value
  readonly toStored: (value: Value, savedAt: number) => Stored
  readonly defaultValue: Value
  readonly readFailureMessage: string
  readonly writeFailureMessage: string
  readonly policy: 'strict-native' | 'recover-web'
}
/** Coordinates timestamp selection, mirrors and ordered writes for two runtime stores. */
export const createTimestampedDualRuntimePreferenceRepository = <
  Stored extends {readonly savedAt: number},
  Value,
>(
  options: TimestampedPreferenceRepositoryOptions<Stored, Value>,
) => {
  const {storage, key} = options
  const coordinator = createTimestampedDualRuntimeStorage<Stored>({
    now: options.now,
    timestamp: 'monotonic',
  })
  const writeLatestToss = createLatestStorageWriter(key, storage.writeToss)
  let latestKnown: Stored | null = null
  const readWeb = () => options.parseStored(storage.readWeb(key))
  const writeWeb = (value: Stored) => storage.writeWeb(key, value) ?? null
  const writeNative = (value: Stored) => coordinator.trackWrite(writeLatestToss(value))
  const observe = (value: Stored | null) => {
    latestKnown = coordinator.selectLatest(value, latestKnown)
    coordinator.observeSavedAt(value?.savedAt ?? 0)
  }
  const webFallback = (error?: unknown): Value => {
    if (options.policy === 'recover-web') {
      const latest = coordinator.selectLatest(latestKnown, readWeb())
      latestKnown = latest
      coordinator.observeSavedAt(latest?.savedAt ?? 0)
      return latest === null ? options.defaultValue : options.toValue(latest)
    }
    let stored: Stored | null = null
    try {
      stored = readWeb()
    } catch {}
    if (stored === null) {
      throw new Error(options.readFailureMessage, {cause: error})
    }
    coordinator.observeSavedAt(stored.savedAt)
    return options.toValue(stored)
  }
  const restore = async (web: Stored | null, toss: Stored | null): Promise<Value> => {
    const latest = coordinator.selectLatest(toss, web)
    if (latest === null) {
      if (options.policy === 'recover-web') {
        return webFallback()
      }
      writeWeb(options.toStored(options.defaultValue, 0))
      return options.defaultValue
    }
    observe(latest)
    coordinator.observeSavedAt(web?.savedAt ?? 0, toss?.savedAt ?? 0)
    if (latest === web) {
      await writeNative(latest).catch(() => undefined)
    } else {
      writeWeb(latest)
    }
    return options.toValue(latest)
  }
  const read = async (): Promise<Value> => {
    const revision = coordinator.revision()
    if (options.policy === 'recover-web' && coordinator.hasPendingWrites()) {
      await coordinator.settleWrites()
      if (coordinator.revision() !== revision) {
        return read()
      }
    }
    const native = storage.usesTossStorage()
    if (!native) {
      const latest = coordinator.selectLatest(latestKnown, readWeb())
      latestKnown = latest
      coordinator.observeSavedAt(latest?.savedAt ?? 0)
      return latest === null ? options.defaultValue : options.toValue(latest)
    }
    // Default-fallback repositories let web read failures propagate before native reads.
    const initialWeb = options.policy === 'recover-web' ? readWeb() : null
    try {
      const web = options.policy === 'recover-web' ? initialWeb : readWeb()
      if (web === null && coordinator.hasPendingWrites()) {
        await coordinator.settleWrites()
        if (coordinator.revision() !== revision) {
          return read()
        }
      }
      const toss = options.parseStored(await storage.readToss(key))
      if (coordinator.revision() !== revision) {
        await coordinator.settleWrites()
        return read()
      }
      // Native legacy values retain authority when timestamps tie.
      const value = await restore(web, toss)
      if (coordinator.revision() !== revision) {
        await coordinator.settleWrites()
        return read()
      }
      return value
    } catch (error: unknown) {
      if (coordinator.revision() !== revision) {
        await coordinator.settleWrites()
        return read()
      }
      return webFallback(error)
    }
  }
  const persist = async (value: Stored): Promise<void> => {
    const webError = writeWeb(value)
    if (!storage.usesTossStorage()) {
      if (webError !== null) {
        throw new Error(options.writeFailureMessage, {cause: webError})
      }
      if (options.policy === 'recover-web') {
        latestKnown = value
      }
      return
    }
    try {
      await writeNative(value)
    } catch (error: unknown) {
      if (options.policy === 'strict-native' || webError !== null) {
        throw new Error(options.writeFailureMessage, {cause: error})
      }
      latestKnown = value
      return
    }
    if (options.policy === 'recover-web') {
      latestKnown = value
    }
    if (webError === null) {
      return
    }
    const web = readWeb()
    if (web !== null && web.savedAt > value.savedAt) {
      if (options.policy === 'recover-web') {
        latestKnown = web
      }
      return
    }
    const removalError = storage.removeWeb(key)
    if (removalError !== null) {
      throw new Error(options.writeFailureMessage, {cause: removalError})
    }
  }
  return {
    read,
    write: (value: Value) =>
      coordinator.writeStored((savedAt) => options.toStored(value, savedAt), persist),
  }
}
