/** @vitest-environment node */

import {IDBFactory} from 'fake-indexeddb'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

let factory: IDBFactory
const connections: IDBDatabase[] = []

beforeEach(() => {
  vi.resetModules()
  factory = new IDBFactory()
  vi.stubGlobal('indexedDB', factory)
})

afterEach(() => {
  for (const database of connections) {
    database.close()
  }
  connections.length = 0
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should share pending and fulfilled opens while preserving the stores and closed connection cache', async () => {
  const {openCustomAlbumDatabase, ALBUM_STORE_NAME, TRACK_STORE_NAME} = await import('../database')
  const pending = openCustomAlbumDatabase()

  expect(openCustomAlbumDatabase()).toBe(pending)
  const database = await pending
  connections.push(database)

  expect(openCustomAlbumDatabase()).toBe(pending)
  expect([...database.objectStoreNames]).toEqual([ALBUM_STORE_NAME, TRACK_STORE_NAME])
  const transaction = database.transaction(TRACK_STORE_NAME)
  const tracks = transaction.objectStore(TRACK_STORE_NAME)

  expect(tracks.keyPath).toBe('id')
  expect(tracks.index('albumId').keyPath).toBe('albumId')
  expect(tracks.index('albumId').unique).toBe(false)
  database.close()
  expect(openCustomAlbumDatabase()).toBe(pending)
  expect(await openCustomAlbumDatabase()).toBe(database)
})

it('should share an unavailable rejection and retry after the platform becomes available', async () => {
  vi.stubGlobal('indexedDB', undefined)
  const {openCustomAlbumDatabase} = await import('../database')
  const pending = openCustomAlbumDatabase()

  expect(openCustomAlbumDatabase()).toBe(pending)
  await expect(pending).rejects.toMatchObject({
    code: 'database-unavailable',
    name: 'CustomAlbumError',
  })
  vi.stubGlobal('indexedDB', factory)
  const retry = openCustomAlbumDatabase()

  expect(retry).not.toBe(pending)
  connections.push(await retry)
  expect(openCustomAlbumDatabase()).toBe(retry)
})

it('should preserve a synchronous open failure and retry on the next call', async () => {
  const failure = new Error('open failed')
  vi.spyOn(factory, 'open').mockImplementationOnce(() => {
    throw failure
  })
  const {openCustomAlbumDatabase} = await import('../database')
  const pending = openCustomAlbumDatabase()

  await expect(pending).rejects.toBe(failure)
  const retry = openCustomAlbumDatabase()

  expect(retry).not.toBe(pending)
  connections.push(await retry)
})

it('should preserve an asynchronous request error cause and retry after the database is removed', async () => {
  const newer = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open('pomo-custom-albums', 2)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  newer.close()
  const {openCustomAlbumDatabase, readRequest} = await import('../database')
  const pending = openCustomAlbumDatabase()

  await expect(pending).rejects.toMatchObject({
    cause: {name: 'VersionError'},
    code: 'database-unavailable',
    name: 'CustomAlbumError',
  })
  await readRequest(factory.deleteDatabase('pomo-custom-albums'))
  const retry = openCustomAlbumDatabase()

  expect(retry).not.toBe(pending)
  connections.push(await retry)
})
