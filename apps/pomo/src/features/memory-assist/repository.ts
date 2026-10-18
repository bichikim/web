import {createSerialTaskQueue} from 'src/utils/create-serial-task-queue'
import {
  createLatestStorageWriter,
  getTossRuntimeStorage,
  getWebRuntimeStorage,
  hasNativeStorageBridge,
  parseStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'
import {type MemoryMemo, parseMemoryMemos} from './schema'

export const MEMORY_MEMOS_STORAGE_KEY = 'pomo:memory-memos:v1'
export const MEMORY_MEMOS_CHANGED_EVENT = 'pomo:memory-memos-changed'

export interface MemoryMemoStorage {
  readonly usesTossStorage: () => boolean
  readonly readToss: () => Promise<string | null>
  readonly readWeb: () => string | null
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

type StoredMemoryMemos =
  | {readonly status: 'invalid' | 'missing'}
  | {readonly memos: ReadonlyArray<MemoryMemo>; readonly status: 'valid'}

const parseStoredMemoryMemos = (storedValue: string | null): StoredMemoryMemos => {
  if (storedValue === null) {
    return {status: 'missing'}
  }

  const memos = parseStorageJson(storedValue, parseMemoryMemos)
  return memos === null ? {status: 'invalid'} : {memos, status: 'valid'}
}

const createRuntimeStorage = (): MemoryMemoStorage => ({
  readToss: () => getTossRuntimeStorage().read(MEMORY_MEMOS_STORAGE_KEY),
  readWeb: () => getWebRuntimeStorage().getItem(MEMORY_MEMOS_STORAGE_KEY),
  usesTossStorage: hasNativeStorageBridge,
  writeToss: createLatestStorageWriter(MEMORY_MEMOS_STORAGE_KEY, writeTossStorageJson),
  writeWeb: (memos) => writeWebStorageJson(MEMORY_MEMOS_STORAGE_KEY, memos),
})

export const createMemoryMemoRepository = (
  storage: MemoryMemoStorage = createRuntimeStorage(),
): MemoryMemoRepository => ({
  async read() {
    if (!storage.usesTossStorage()) {
      const webRead = parseStoredMemoryMemos(storage.readWeb())
      return webRead.status === 'valid' ? webRead.memos : []
    }

    try {
      const tossRead = parseStoredMemoryMemos(await storage.readToss())

      if (tossRead.status === 'valid') {
        const webError = storage.writeWeb(tossRead.memos)
        if (webError !== null) {
          throw webError
        }

        return tossRead.memos
      }

      const webRead = parseStoredMemoryMemos(storage.readWeb())
      if (webRead.status !== 'valid') {
        return []
      }

      if (tossRead.status === 'missing') {
        await storage.writeToss(webRead.memos).catch((error: unknown) => {
          globalThis.reportError?.(error)
        })
      }

      return webRead.memos
    } catch (error) {
      throw new Error('Failed to read memory memos.', {cause: error})
    }
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
