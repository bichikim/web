/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'
import {checkNativeBlobStorage} from '../check-native-blob-storage'

interface StorageEventHandlers {
  onabort: (() => void) | null
  oncomplete: (() => void) | null
}

interface OpenEventHandlers {
  onerror: (() => void) | null
  onsuccess: (() => void) | null
  onupgradeneeded: (() => void) | null
}

const createStorage = () => {
  const put = vi.fn<(value: Blob, key: string) => void>()
  const transactionEvents: StorageEventHandlers = {onabort: null, oncomplete: null}
  const transaction = {
    ...transactionEvents,
    error: null as DOMException | null,
    objectStore: vi.fn(() => ({put})),
  }
  const database = {
    close: vi.fn(),
    createObjectStore: vi.fn(),
    name: 'native-probe-database',
    transaction: vi.fn(() => transaction),
  }
  const openEvents: OpenEventHandlers = {onerror: null, onsuccess: null, onupgradeneeded: null}
  const request = {
    ...openEvents,
    error: null as DOMException | null,
    result: database,
  }
  const storage = {
    deleteDatabase: vi.fn(),
    open: vi.fn<(name: string, version: number) => typeof request>(() => request),
  }
  vi.stubGlobal('indexedDB', storage)
  return {database, put, request, storage, transaction}
}

afterEach(() => vi.unstubAllGlobals())

it('should wait for commit before closing the connection and requesting database deletion', async () => {
  const {database, put, request, storage, transaction} = createStorage()
  const completed = vi.fn()
  const checking = checkNativeBlobStorage().then(completed)
  expect(storage.open).toHaveBeenCalledWith(
    expect.stringMatching(/^native-blob-baseline-[\da-f-]+$/),
    1,
  )
  request.onupgradeneeded?.()
  expect(database.createObjectStore).toHaveBeenCalledWith('blob')
  request.onsuccess?.()
  expect(database.transaction).toHaveBeenCalledWith('blob', 'readwrite')
  expect(transaction.objectStore).toHaveBeenCalledWith('blob')
  expect(put).toHaveBeenCalledWith(expect.any(Blob), 'one')
  const [blob] = put.mock.calls[0]!
  expect(await blob.text()).toBe('baseline')
  expect(completed).not.toHaveBeenCalled()
  expect(database.close).not.toHaveBeenCalled()
  expect(storage.deleteDatabase).not.toHaveBeenCalled()
  storage.deleteDatabase.mockImplementation(() => expect(database.close).toHaveBeenCalledOnce())
  transaction.oncomplete?.()
  await checking
  expect(storage.deleteDatabase).toHaveBeenCalledExactlyOnceWith(database.name)
  expect(completed).toHaveBeenCalledOnce()
})

it('should close an aborted transaction and reject with the original error', async () => {
  const {database, request, storage, transaction} = createStorage()
  const failure = new DOMException('Blob write failed', 'UnknownError')
  transaction.error = failure
  const checking = checkNativeBlobStorage()
  const rejected = expect(checking).rejects.toBe(failure)
  request.onsuccess?.()
  transaction.onabort?.()
  await rejected
  expect(database.close).toHaveBeenCalledOnce()
  expect(storage.deleteDatabase).toHaveBeenCalledExactlyOnceWith(database.name)
})

it('should preserve an open failure without starting a transaction or deleting a database', async () => {
  const {database, request, storage} = createStorage()
  const failure = new DOMException('Storage unavailable', 'SecurityError')
  request.error = failure
  const checking = checkNativeBlobStorage()
  const rejected = expect(checking).rejects.toBe(failure)
  request.onerror?.()
  await rejected
  expect(database.transaction).not.toHaveBeenCalled()
  expect(database.close).not.toHaveBeenCalled()
  expect(storage.deleteDatabase).not.toHaveBeenCalled()
})

it('should preserve a synchronous open exception', async () => {
  const {storage} = createStorage()
  const failure = new Error('open failed')
  storage.open.mockImplementationOnce(() => {
    throw failure
  })
  await expect(checkNativeBlobStorage()).rejects.toBe(failure)
  expect(storage.deleteDatabase).not.toHaveBeenCalled()
})

it('should create a fresh probe for every call without sharing a completed result', async () => {
  const {database, request, storage, transaction} = createStorage()
  const first = checkNativeBlobStorage()
  request.onsuccess?.()
  transaction.oncomplete?.()
  await first

  const completed = vi.fn()
  const second = checkNativeBlobStorage().then(completed)
  expect(storage.open).toHaveBeenCalledTimes(2)
  const [firstName] = storage.open.mock.calls[0]!
  const [secondName] = storage.open.mock.calls[1]!
  expect(secondName).not.toBe(firstName)
  await Promise.resolve()
  expect(completed).not.toHaveBeenCalled()
  request.onsuccess?.()
  transaction.oncomplete?.()
  await second
  expect(database.close).toHaveBeenCalledTimes(2)
  expect(storage.deleteDatabase).toHaveBeenCalledTimes(2)
})
