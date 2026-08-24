interface NativeStorageSnapshot {
  readonly key: string
  readonly value: unknown
}

interface NativeStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

export interface SerialNativeStorageWriter {
  write(key: string, value: unknown): Promise<unknown | null>
}

export interface LatestNativeStorageWriter {
  write(value: unknown): Promise<void>
}

type ParseStoredValue<Value> = (value: unknown) => Value | null

let nativeStoragePromise: Promise<NativeStorage> | null = null

const loadNativeStorage = (): Promise<NativeStorage> => {
  nativeStoragePromise ??= import('@apps-in-toss/web-framework').then(({Storage}) => Storage)
  return nativeStoragePromise
}

/** Reports whether the current browser is hosted by the Apps in Toss native bridge. */
export const hasNativeStorageBridge = () => 'ReactNativeWebView' in window

/** Parses one JSON storage value and normalizes missing, malformed, or invalid data to null. */
export const parseStorageJson = <Value>(
  storedValue: string | null,
  parseValue: ParseStoredValue<Value>,
): Value | null => {
  if (storedValue === null) {
    return null
  }

  try {
    return parseValue(JSON.parse(storedValue) as unknown)
  } catch {
    return null
  }
}

/** Reads and parses best-effort browser storage without leaking platform errors. */
export const readWebStorageJson = <Value>(
  key: string,
  parseValue: ParseStoredValue<Value>,
): Value | null => {
  try {
    return parseStorageJson(localStorage.getItem(key), parseValue)
  } catch {
    return null
  }
}

/** Writes JSON to best-effort browser storage and returns the platform error on failure. */
export const writeWebStorageJson = (key: string, value: unknown): unknown | null => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return null
  } catch (error: unknown) {
    return error
  }
}

/** Loads Apps in Toss storage only when a native read is actually required. */
export const readNativeStorageJson = async <Value>(
  key: string,
  parseValue: ParseStoredValue<Value>,
): Promise<Value | null> => {
  const storage = await loadNativeStorage()
  return parseStorageJson(await storage.getItem(key), parseValue)
}

/** Loads Apps in Toss storage only when a native write is actually required. */
export const writeNativeStorageJson = async (key: string, value: unknown): Promise<void> => {
  const storage = await loadNativeStorage()
  await storage.setItem(key, JSON.stringify(value))
}

/** Creates an isolated FIFO native writer for one repository's web-authoritative snapshots. */
export const createSerialNativeStorageWriter = (): SerialNativeStorageWriter => {
  let writeQueue = Promise.resolve()

  return {
    write(key, value) {
      const write = writeQueue.then(async () => {
        try {
          await writeNativeStorageJson(key, value)
          return null
        } catch (error: unknown) {
          return error
        }
      })
      writeQueue = write.then(() => undefined)
      return write
    },
  }
}

/** Creates a native writer that repairs late stale writes with its newest requested snapshot. */
export const createLatestNativeStorageWriter = (key: string): LatestNativeStorageWriter => {
  let latestSnapshot: NativeStorageSnapshot | null = null

  const converge = async (snapshot: NativeStorageSnapshot): Promise<void> => {
    try {
      await writeNativeStorageJson(snapshot.key, snapshot.value)
    } catch {
      return
    }

    const currentSnapshot = latestSnapshot
    if (currentSnapshot !== snapshot && currentSnapshot !== null) {
      await converge(currentSnapshot)
    }
  }

  return {
    async write(value) {
      const snapshot = {key, value} satisfies NativeStorageSnapshot
      latestSnapshot = snapshot
      await converge(snapshot)
    },
  }
}
