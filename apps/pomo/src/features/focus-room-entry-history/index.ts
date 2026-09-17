import {createSerialTaskQueue} from 'src/utils/create-serial-task-queue'
import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

const STORAGE_KEY = 'pomo:focus-room-entry-history:v1'
const parseEntryHistory = (value: unknown): true | null => (value === true ? true : null)

export interface EntryHistoryStorage {
  readonly usesNative: () => boolean
  readonly readWeb: () => true | null
  readonly readToss: () => Promise<true | null>
  readonly writeWeb: () => unknown | null
  readonly writeToss: () => Promise<void>
}
export interface EntryHistoryRepository {
  readonly read: () => Promise<boolean>
  readonly write: () => Promise<void>
  readonly settle: () => Promise<void>
}

/** Owns entry-history writes, native repairs, and pending-write completion for one store. */
export const createEntryHistoryRepository = (
  storage: EntryHistoryStorage,
): EntryHistoryRepository => {
  const queue = createSerialTaskQueue()
  /** Reads whether a previous entry was persisted for this browser or host app. */
  const read = async (): Promise<boolean> => {
    if (storage.readWeb() === true) {
      if (storage.usesNative()) {
        await queue
          .run(() => storage.writeToss())
          .catch((error: unknown) => {
            console.warn('Failed to repair native focus room entry history.', error)
          })
      }
      return true
    }
    if (!storage.usesNative()) {
      return false
    }
    const entered = await storage.readToss()
    return entered === true
  }

  const persistRuntimeEntryHistory = async (): Promise<void> => {
    const webError = storage.writeWeb()
    if (storage.usesNative()) {
      try {
        await storage.writeToss()
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

  return {read, settle: queue.settle, write: () => queue.run(persistRuntimeEntryHistory)}
}

const runtimeRepository = createEntryHistoryRepository({
  readToss: () => readTossStorageJson(STORAGE_KEY, parseEntryHistory),
  readWeb: () => readWebStorageJson(STORAGE_KEY, parseEntryHistory),
  usesNative: hasNativeStorageBridge,
  writeToss: () => writeTossStorageJson(STORAGE_KEY, true),
  writeWeb: () => writeWebStorageJson(STORAGE_KEY, true),
})
export const readFocusRoomEntryHistory = () => runtimeRepository.read()
export const writeFocusRoomEntryHistory = () => runtimeRepository.write()
export const settleEntryHistoryWrites = () => runtimeRepository.settle()
