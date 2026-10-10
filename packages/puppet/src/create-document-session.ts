import {parseDocumentValue, type PuppetDocument} from './player'

interface CreateDocumentSessionOptions {
  readonly database: IDBFactory
  readonly storage: Pick<Storage, 'getItem' | 'setItem'>
}

export interface DocumentSession {
  readonly read: () => Promise<PuppetDocument | null>
  readonly write: (document: PuppetDocument) => Promise<void>
}

const SESSION_KEY = 'puppet:document-session:v1'
const DATABASE_NAME = 'puppet-editor-recovery'
const STORE_NAME = 'documents'

const openDatabase = (factory: IDBFactory): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, 1)
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
  const key = options.storage.getItem(SESSION_KEY) ?? crypto.randomUUID()
  options.storage.setItem(SESSION_KEY, key)
  return {
    async read() {
      const database = await openDatabase(options.database)
      try {
        const transaction = database.transaction(STORE_NAME, 'readonly')
        const completed = finishTransaction(transaction)
        const request = transaction.objectStore(STORE_NAME).get(key)
        await completed
        const value: unknown = request.result
        if (value === undefined) {
          return null
        }
        const result = parseDocumentValue(value)
        if (!result.ok) {
          throw new Error('Recovery document is invalid')
        }
        return result.document
      } finally {
        database.close()
      }
    },
    async write(document) {
      const database = await openDatabase(options.database)
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        const completed = finishTransaction(transaction)
        transaction.objectStore(STORE_NAME).put(document, key)
        await completed
      } finally {
        database.close()
      }
    },
  }
}
