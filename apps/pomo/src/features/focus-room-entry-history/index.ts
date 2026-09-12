import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

const STORAGE_KEY = 'pomo:focus-room-entry-history:v1'
const parseEntryHistory = (value: unknown): true | null => (value === true ? true : null)

/** Reads whether a previous entry was persisted for this browser or host app. */
export const readFocusRoomEntryHistory = async (): Promise<boolean> => {
  if (readWebStorageJson(STORAGE_KEY, parseEntryHistory) === true) {
    return true
  }
  if (!hasNativeStorageBridge()) {
    return false
  }
  const entered = await readTossStorageJson(STORAGE_KEY, parseEntryHistory)
  return entered === true
}

const persistRuntimeEntryHistory = async (): Promise<void> => {
  const webError = writeWebStorageJson(STORAGE_KEY, true)
  if (hasNativeStorageBridge()) {
    try {
      await writeTossStorageJson(STORAGE_KEY, true)
      return
    } catch (error: unknown) {
      if (webError !== null) {
        throw new Error('Failed to persist focus room entry history.', {cause: error})
      }
      return
    }
  }
  if (webError !== null) {
    throw new Error('Failed to persist focus room entry history.', {cause: webError})
  }
}

let pendingWrite = Promise.resolve()

/** Persists completed entry in runtime storage, serializing native writes. */
export const writeFocusRoomEntryHistory = (): Promise<void> => {
  const write = pendingWrite.then(persistRuntimeEntryHistory)
  pendingWrite = write.catch(() => undefined)
  return write
}

/** Settles writes already requested before resetting runtime entry storage. */
export const settleEntryHistoryWrites = (): Promise<void> => pendingWrite
