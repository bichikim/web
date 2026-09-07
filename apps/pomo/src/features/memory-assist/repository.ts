import {
  createSerialNativeStorageWriter,
  hasNativeStorageBridge,
  parseStorageJson,
  readNativeStorageJson,
  writeWebStorageJson,
} from '../runtime-storage'
import {type MemoryMemo, parseMemoryMemos} from './schema'

const STORAGE_KEY = 'pomo:memory-memos:v1'
export const MEMORY_MEMOS_CHANGED_EVENT = 'pomo:memory-memos-changed'

export interface MemoryMemoStorage {
  readonly hasNative: () => boolean
  readonly readNative: () => Promise<ReadonlyArray<MemoryMemo> | null>
  readonly readWeb: () => ReadonlyArray<MemoryMemo> | null
  readonly writeNative: (memos: ReadonlyArray<MemoryMemo>) => Promise<unknown | null>
  readonly writeWeb: (memos: ReadonlyArray<MemoryMemo>) => unknown | null
}

export interface MemoryMemoRepository {
  readonly read: () => Promise<ReadonlyArray<MemoryMemo>>
  readonly write: (memos: ReadonlyArray<MemoryMemo>) => Promise<void>
}

const runtimeNativeWriter = createSerialNativeStorageWriter()

const runtimeStorage = {
  hasNative: hasNativeStorageBridge,
  readNative: () => readNativeStorageJson(STORAGE_KEY, parseMemoryMemos),
  readWeb: () => parseStorageJson(localStorage.getItem(STORAGE_KEY), parseMemoryMemos),
  writeNative: (memos) => runtimeNativeWriter.write(STORAGE_KEY, memos),
  writeWeb: (memos) => writeWebStorageJson(STORAGE_KEY, memos),
} satisfies MemoryMemoStorage

export const createMemoryMemoRepository = (
  storage: MemoryMemoStorage = runtimeStorage,
): MemoryMemoRepository => ({
  async read() {
    if (!storage.hasNative()) {
      return storage.readWeb() ?? []
    }

    try {
      const nativeMemos = await storage.readNative()

      if (nativeMemos !== null) {
        storage.writeWeb(nativeMemos)
        return nativeMemos
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

    if (!storage.hasNative()) {
      if (webError !== null) {
        throw new Error('Failed to persist memory memos.', {cause: webError})
      }

      return
    }

    const nativeError = await storage.writeNative(snapshot)

    if (nativeError !== null) {
      throw new Error('Failed to persist memory memos.', {cause: nativeError})
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
