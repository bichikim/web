import {parseDocumentValue, type PuppetDocument} from './player'
import type {DocumentRecovery, DocumentRecoveryEntry} from './editor/document-recovery'
import {compactDocumentTextures} from './player/texture-assets'

interface CreateDocumentSessionOptions {
  readonly databaseName?: string
  readonly sessionId?: string
  readonly database: IDBFactory
  readonly storage: Pick<Storage, 'getItem' | 'setItem'>
}

export interface DocumentSession extends DocumentRecovery {
  readonly read: () => Promise<PuppetDocument | null>
  readonly write: (document: PuppetDocument) => Promise<void>
}

const SESSION_KEY = 'puppet:document-session:v1'
const DATABASE_NAME = 'puppet-editor-recovery'
const STORE_NAME = 'documents'

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
    transaction.onerror = () => reject(transaction.error)
  })

export const createDocumentSession = (options: CreateDocumentSessionOptions): DocumentSession => {
  const key = options.sessionId ?? options.storage.getItem(SESSION_KEY) ?? crypto.randomUUID()
  const databaseName = options.databaseName ?? DATABASE_NAME
  if (options.sessionId === undefined) {
    options.storage.setItem(SESSION_KEY, key)
  }
  const loadRecovery = async (id: string) => {
    const database = await openDatabase(options.database, databaseName)
    try {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const completed = finishTransaction(transaction)
      const request = transaction.objectStore(STORE_NAME).get(id)
      await completed
      const value: unknown = request.result
      if (value === undefined) {
        return null
      }
      const {result} = readRecord(value)
      if (!result.ok) {
        throw new Error('Recovery document is invalid')
      }
      return result.document
    } finally {
      database.close()
    }
  }
  return {
    async listRecoveries() {
      const database = await openDatabase(options.database, databaseName)
      try {
        const transaction = database.transaction(STORE_NAME, 'readonly')
        const completed = finishTransaction(transaction)
        const entries: DocumentRecoveryEntry[] = []
        const request = transaction.objectStore(STORE_NAME).openCursor()
        request.onsuccess = () => {
          const cursor = request.result
          if (cursor === null) {
            return
          }
          if (typeof cursor.key === 'string' && cursor.key !== key) {
            const {result, savedAt} = readRecord(cursor.value)
            if (result.ok) {
              entries.push({
                id: cursor.key,
                motionCount: result.document.motions.length,
                partCount: result.document.parts.length,
                savedAt,
              })
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
      const database = await openDatabase(options.database, databaseName)
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        const completed = finishTransaction(transaction)
        transaction
          .objectStore(STORE_NAME)
          .put({document: compactDocumentTextures(document), savedAt: Date.now()}, key)
        await completed
      } finally {
        database.close()
      }
    },
  }
}
