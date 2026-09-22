import {createSerialTaskQueue} from 'src/utils/create-serial-task-queue'
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

export interface MemoryMemosChangedEventDetail {
  readonly memos: ReadonlyArray<MemoryMemo>
  readonly revision: number
}

const createRuntimeStorage = (): MemoryMemoStorage => ({
  readToss: () => readTossStorageJson(STORAGE_KEY, parseMemoryMemos),
  readWeb: () => parseStorageJson(localStorage.getItem(STORAGE_KEY), parseMemoryMemos),
  usesTossStorage: hasNativeStorageBridge,
  writeToss: createLatestStorageWriter(STORAGE_KEY, writeTossStorageJson),
  writeWeb: (memos) => writeWebStorageJson(STORAGE_KEY, memos),
})

export const createMemoryMemoRepository = (
  storage: MemoryMemoStorage = createRuntimeStorage(),
): MemoryMemoRepository => ({
  async read() {
    if (!storage.usesTossStorage()) {
      return storage.readWeb() ?? []
    }

    try {
      const tossMemos = await storage.readToss()

      if (tossMemos !== null) {
        const webError = storage.writeWeb(tossMemos)
        if (webError !== null) {
          throw webError
        }

        return tossMemos
      }

      const webMemos = storage.readWeb()
      if (webMemos !== null) {
        await storage.writeToss(webMemos).catch((error: unknown) => {
          globalThis.reportError?.(error)
        })
        return webMemos
      }

      storage.writeWeb([])
    } catch (error) {
      throw new Error('Failed to read memory memos.', {cause: error})
    }

    return []
  },
  async write(memos) {
    const snapshot = parseMemoryMemos(memos)

    if (snapshot === null) {
      throw new TypeError('Invalid memory memo snapshot.')
    }

    const webError = storage.writeWeb(snapshot)
    if (webError !== null) {
      throw new Error('Failed to persist memory memos.', {cause: webError})
    }

    if (!storage.usesTossStorage()) {
      return
    }

    try {
      await storage.writeToss(snapshot)
    } catch (error) {
      throw new Error('Failed to persist memory memos.', {cause: error})
    }
  },
})

export interface MemoryMemoStore extends MemoryMemoRepository {
  readonly update: (
    update: (memos: ReadonlyArray<MemoryMemo>) => ReadonlyArray<MemoryMemo>,
  ) => Promise<ReadonlyArray<MemoryMemo>>
}

/** Owns serialized memo updates and successful-write notifications for one persistence boundary. */
export const createMemoryMemoStore = (
  storage: MemoryMemoStorage,
  notify: (detail: MemoryMemosChangedEventDetail) => void,
): MemoryMemoStore => {
  const repository = createMemoryMemoRepository(storage)
  const queue = createSerialTaskQueue()
  let revision = 0
  const persist = async (memos: ReadonlyArray<MemoryMemo>) => {
    await repository.write(memos)
    revision += 1
    notify({memos, revision})
  }
  return {
    read: () => queue.run(repository.read),
    update: (update) =>
      queue.run(async () => {
        const memos = update(await repository.read())
        await persist(memos)
        return memos
      }),
    write: (memos) => queue.run(() => persist(memos)),
  }
}

const runtimeStore = createMemoryMemoStore(createRuntimeStorage(), (detail) => {
  globalThis.dispatchEvent(new CustomEvent(MEMORY_MEMOS_CHANGED_EVENT, {detail}))
})

export const readMemoryMemos = () => runtimeStore.read()
export const writeMemoryMemos = (memos: ReadonlyArray<MemoryMemo>) => runtimeStore.write(memos)
export const updateMemoryMemos = (
  update: (memos: ReadonlyArray<MemoryMemo>) => ReadonlyArray<MemoryMemo>,
) => runtimeStore.update(update)
