import {stringifyChunked} from '@discoveryjs/json-ext'
import {
  compactDocumentTextures,
  parseDocumentStream,
  parseDocumentValue,
  type PuppetDocument,
} from '@winter-love/puppet/player'
import type {DocumentRecovery, DocumentRecoveryEntry} from '@winter-love/puppet/editor'

interface CreateDocumentSessionOptions {
  /** Recovery database name; defaults to the existing editor recovery database. */
  readonly databaseName?: string
  /** Session to read and write; omitted, reuse or create the key in storage. */
  readonly sessionId?: string
  /**
   * Finite Unix milliseconds, sampled once per serialized snapshot; defaults to Date.now.
   * A thrown error or non-finite value rejects the write without replacing the recovery.
   */
  readonly now?: () => number
  /** IndexedDB factory; each operation opens and closes its own connection. */
  readonly database: IDBFactory
  /** Stores the current session key when sessionId is omitted; owned by the caller. */
  readonly storage: Pick<Storage, 'getItem' | 'setItem'>
}

export interface DocumentSession extends DocumentRecovery {
  readonly read: () => Promise<PuppetDocument | null>
  readonly write: (document: PuppetDocument) => Promise<void>
}

const SESSION_KEY = 'puppet:document-session:v1'
const DATABASE_NAME = 'puppet-editor-recovery'
const STORE_NAME = 'documents'

// Bound each stored string independently of the full document size, in UTF-16 code units.
const CHUNK_LENGTH = 4_194_304

interface ChunkedRecord {
  readonly storageFormat: 'json-chunks-v1'
  readonly chunkCount: number
  readonly characterCount: number
  readonly partCount: number
  readonly motionCount: number
  readonly savedAt: number
}

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

const isChunkedRecord = (value: unknown): value is ChunkedRecord =>
  typeof value === 'object' &&
  value !== null &&
  'storageFormat' in value &&
  value.storageFormat === 'json-chunks-v1' &&
  'characterCount' in value &&
  isCount(value.characterCount) &&
  value.characterCount > 0 &&
  'chunkCount' in value &&
  value.chunkCount === Math.ceil(value.characterCount / CHUNK_LENGTH) &&
  'partCount' in value &&
  isCount(value.partCount) &&
  'motionCount' in value &&
  isCount(value.motionCount) &&
  'savedAt' in value &&
  typeof value.savedAt === 'number' &&
  Number.isFinite(value.savedAt)

const serializeChunks = (document: PuppetDocument): string[] => {
  const chunks: string[] = []
  let pending = ''
  for (const part of stringifyChunked(compactDocumentTextures(document))) {
    let offset = 0
    while (offset < part.length) {
      const end = Math.min(part.length, offset + CHUNK_LENGTH - pending.length)
      pending += part.slice(offset, end)
      offset = end
      if (pending.length === CHUNK_LENGTH) {
        chunks.push(pending)
        pending = ''
      }
    }
  }
  if (pending.length > 0) {
    chunks.push(pending)
  }
  return chunks
}

const readChunks = (store: IDBObjectStore, id: string, record: ChunkedRecord): string[] => {
  const chunks: string[] = []
  const request = store.openCursor(IDBKeyRange.bound([id, 0], [id, record.chunkCount - 1]))
  request.onsuccess = () => {
    const cursor = request.result
    if (cursor === null) {
      return
    }
    const index = chunks.length
    const {key} = cursor
    const value: unknown = cursor.value
    const length = Math.min(CHUNK_LENGTH, record.characterCount - index * CHUNK_LENGTH)
    if (
      Array.isArray(key) &&
      key.length === 2 &&
      key[1] === index &&
      typeof value === 'string' &&
      value.length === length
    ) {
      chunks.push(value)
      cursor.continue()
    }
  }
  return chunks
}

const parseChunks = async (record: ChunkedRecord, chunks: readonly string[]) => {
  if (chunks.length !== record.chunkCount) {
    throw new Error('Recovery document is invalid')
  }
  const iterator = chunks.values()
  const source = new ReadableStream<string>({
    pull(controller) {
      const item = iterator.next()
      if (item.done) {
        controller.close()
      } else {
        controller.enqueue(item.value)
      }
    },
  }).pipeThrough(new TextEncoderStream())
  const result = await parseDocumentStream({source})
  if (!result.ok) {
    throw new Error('Recovery document is invalid')
  }
  return result.document
}

const readRecord = (value: unknown) => {
  const stored =
    typeof value === 'object' && value !== null && 'document' in value && 'savedAt' in value
      ? value
      : {document: value, savedAt: null}
  return {
    result: parseDocumentValue(stored.document),
    savedAt:
      typeof stored.savedAt === 'number' && Number.isFinite(stored.savedAt) ? stored.savedAt : null,
  }
}

const openDatabase = (factory: IDBFactory, name: string): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = factory.open(name, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const finishTransaction = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Recovery transaction aborted'))
  })

export const createDocumentSession = (options: CreateDocumentSessionOptions): DocumentSession => {
  const key = options.sessionId ?? options.storage.getItem(SESSION_KEY) ?? crypto.randomUUID()
  const databaseName = options.databaseName ?? DATABASE_NAME
  const now = options.now ?? Date.now
  if (options.sessionId === undefined) {
    options.storage.setItem(SESSION_KEY, key)
  }
  const loadRecovery = async (id: string) => {
    const database = await openDatabase(options.database, databaseName)
    let value: unknown
    let chunks: string[] = []
    try {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const completed = finishTransaction(transaction)
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)
      request.onsuccess = () => {
        const stored: unknown = request.result
        if (isChunkedRecord(stored)) {
          chunks = readChunks(store, id, stored)
        }
      }
      await completed
      value = request.result
    } finally {
      database.close()
    }
    if (value === undefined) {
      return null
    }
    if (isChunkedRecord(value)) {
      return parseChunks(value, chunks)
    }
    const {result} = readRecord(value)
    if (!result.ok) {
      throw new Error('Recovery document is invalid')
    }
    return result.document
  }
  return {
    async listRecoveries() {
      const database = await openDatabase(options.database, databaseName)
      try {
        const transaction = database.transaction(STORE_NAME, 'readonly')
        const completed = finishTransaction(transaction)
        const entries: DocumentRecoveryEntry[] = []
        const store = transaction.objectStore(STORE_NAME)
        const request = store.openKeyCursor()
        request.onsuccess = () => {
          const cursor = request.result
          if (cursor === null) {
            return
          }
          const id = cursor.key
          if (typeof id === 'string' && id !== key) {
            const record = store.get(id)
            record.onsuccess = () => {
              const value: unknown = record.result
              if (isChunkedRecord(value)) {
                entries.push({
                  id,
                  motionCount: value.motionCount,
                  partCount: value.partCount,
                  savedAt: value.savedAt,
                })
                return
              }
              const {result, savedAt} = readRecord(value)
              if (result.ok) {
                entries.push({
                  id,
                  motionCount: result.document.motions.length,
                  partCount: result.document.parts.length,
                  savedAt,
                })
              }
            }
          }
          cursor.continue()
        }
        await completed
        return entries.toSorted((left, right) => (right.savedAt ?? 0) - (left.savedAt ?? 0))
      } finally {
        database.close()
      }
    },
    loadRecovery,
    read: () => loadRecovery(key),
    async write(document) {
      const chunks = serializeChunks(document)
      const savedAt = now()
      if (!Number.isFinite(savedAt)) {
        throw new RangeError('Recovery timestamp must be finite')
      }
      const record: ChunkedRecord = {
        characterCount: chunks.reduce((total, chunk) => total + chunk.length, 0),
        chunkCount: chunks.length,
        motionCount: document.motions.length,
        partCount: document.parts.length,
        savedAt,
        storageFormat: 'json-chunks-v1',
      }
      const database = await openDatabase(options.database, databaseName)
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        const completed = finishTransaction(transaction)
        const store = transaction.objectStore(STORE_NAME)
        const previous = store.getAllKeys(IDBKeyRange.bound([key], [key, []], false, true))
        let writeError: unknown
        previous.onsuccess = () => {
          try {
            for (const previousKey of previous.result) {
              store.delete(previousKey)
            }
            chunks.forEach((chunk, index) => store.put(chunk, [key, index]))
            store.put(record, key)
          } catch (error) {
            writeError = error
            transaction.abort()
          }
        }
        await completed.catch((error: unknown) => {
          throw writeError ?? error
        })
      } finally {
        database.close()
      }
    },
  }
}
