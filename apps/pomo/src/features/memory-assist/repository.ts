import {
  createLatestStorageWriter,
  hasNativeStorageBridge,
  parseStorageJson,
  readTossStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'
import {type MemoryMemo, parseMemoryMemos} from './schema'

const STORAGE_KEY = 'pomo:memory-memos:v1'
export const MEMORY_MEMOS_CHANGED_EVENT = 'pomo:memory-memos-changed'

export interface MemoryMemoStorage {
  readonly usesTossStorage: () => boolean
  readonly readToss: () => Promise<ReadonlyArray<MemoryMemo> | null>
  readonly readWeb: () => ReadonlyArray<MemoryMemo> | null
  readonly writeToss: (memos: ReadonlyArray<MemoryMemo>) => Promise<void>
  readonly writeWeb: (memos: ReadonlyArray<MemoryMemo>) => unknown | null
}

export interface MemoryMemoRepository {
  readonly read: () => Promise<ReadonlyArray<MemoryMemo>>
  readonly write: (memos: ReadonlyArray<MemoryMemo>) => Promise<void>
}

const runtimeTossWriter = createLatestStorageWriter(STORAGE_KEY, writeTossStorageJson)

const runtimeStorage = {
  readToss: () => readTossStorageJson(STORAGE_KEY, parseMemoryMemos),
  readWeb: () => parseStorageJson(localStorage.getItem(STORAGE_KEY), parseMemoryMemos),
  usesTossStorage: hasNativeStorageBridge,
  writeToss: runtimeTossWriter,
  writeWeb: (memos) => writeWebStorageJson(STORAGE_KEY, memos),
} satisfies MemoryMemoStorage

export const createMemoryMemoRepository = (
  storage: MemoryMemoStorage = runtimeStorage,
): MemoryMemoRepository => ({
  async read() {
    if (!storage.usesTossStorage()) {
      return storage.readWeb() ?? []
    }

    try {
      const tossMemos = await storage.readToss()

      if (tossMemos !== null) {
        storage.writeWeb(tossMemos)
        return tossMemos
      }
    } catch (error) {
      throw new Error('Failed to read memory memos.', {cause: error})
    }

    storage.writeWeb([])
    return []
  },
  async write(memos) {
    const snapshot = parseMemoryMemos(memos)

    if (snapshot === null) {
      throw new TypeError('Invalid memory memo snapshot.')
    }

    const webError = storage.writeWeb(snapshot)

    if (!storage.usesTossStorage()) {
      if (webError !== null) {
        throw new Error('Failed to persist memory memos.', {cause: webError})
      }

      return
    }

    try {
      await storage.writeToss(snapshot)
    } catch (error) {
      throw new Error('Failed to persist memory memos.', {cause: error})
    }
  },
})

const runtimeRepository = createMemoryMemoRepository()
let updateQueue = Promise.resolve<ReadonlyArray<MemoryMemo>>([])

export const readMemoryMemos = () => runtimeRepository.read()

export const writeMemoryMemos = async (memos: ReadonlyArray<MemoryMemo>) => {
  await runtimeRepository.write(memos)
  window.dispatchEvent(new CustomEvent(MEMORY_MEMOS_CHANGED_EVENT, {detail: memos}))
}

export const updateMemoryMemos = (
  update: (memos: ReadonlyArray<MemoryMemo>) => ReadonlyArray<MemoryMemo>,
) => {
  const pendingUpdate = updateQueue
    .catch(() => [])
    .then(async () => {
      const currentMemos = await runtimeRepository.read()
      const nextMemos = update(currentMemos)
      await writeMemoryMemos(nextMemos)
      return nextMemos
    })
  updateQueue = pendingUpdate
  return pendingUpdate
}
