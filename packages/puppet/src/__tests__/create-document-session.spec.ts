/** @vitest-environment jsdom */
import {IDBFactory} from 'fake-indexeddb'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createDocumentSession} from '../create-document-session'
import {createDemoDocument, createEmptyDocument, PUPPET_DOCUMENT_FORMAT} from '../player'

beforeEach(() => sessionStorage.clear())
afterEach(() => vi.restoreAllMocks())

const writeRecord = (factory: IDBFactory, id: string, value: unknown): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = factory.open('puppet-editor-recovery', 1)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('documents', 'readwrite')
      transaction.objectStore('documents').put(value, id)
      transaction.oncomplete = () => {
        database.close()
        resolve()
      }
      transaction.onabort = () => reject(transaction.error)
    }
    request.onerror = () => reject(request.error)
  })

test('should restore edits with only the session key in sessionStorage', async () => {
  const database = new IDBFactory()
  const options = {database, storage: sessionStorage}
  const document = createDemoDocument()
  const edited = {
    ...document,
    motions: document.motions.map((motion, index) =>
      index === 0 ? {...motion, id: 'edited'} : motion,
    ),
  }
  const session = createDocumentSession(options)
  expect(await session.read()).toBeNull()
  await session.write(edited)
  const restored = await createDocumentSession(options).read()
  expect(restored?.motions[0]?.id).toBe('edited')
  expect(restored?.parts).toEqual(document.parts)
  expect(sessionStorage.length).toBe(1)
  expect(sessionStorage.getItem(sessionStorage.key(0)!)).not.toContain(PUPPET_DOCUMENT_FORMAT)
})

test('should isolate documents between tab storage areas', async () => {
  const database = new IDBFactory()
  const first = createDocumentSession({database, storage: sessionStorage})
  await first.write(createDemoDocument())
  sessionStorage.clear()
  const second = createDocumentSession({database, storage: sessionStorage})
  expect(await second.read()).toBeNull()
})

test('should report unavailable storage instead of claiming that recovery was saved', () => {
  const storage = {
    getItem: () => {
      throw new Error('storage denied')
    },
    setItem: () => {},
  }
  expect(() => createDocumentSession({database: new IDBFactory(), storage})).toThrow(
    'storage denied',
  )
})

test('should find other tabs newest first and restore without overwriting their documents', async () => {
  const database = new IDBFactory()
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const first = createDocumentSession({database, storage: sessionStorage})
  const document = createDemoDocument()
  await first.write(document)
  sessionStorage.clear()
  clock.mockReturnValue(2000)
  const second = createDocumentSession({database, storage: sessionStorage})
  await second.write({...document, motions: []})
  sessionStorage.clear()
  const current = createDocumentSession({database, storage: sessionStorage})
  await current.write(createEmptyDocument())
  const entries = await current.listRecoveries()
  expect(entries.map((entry) => entry.savedAt)).toEqual([2000, 1000])
  expect(entries[0]).toMatchObject({motionCount: 0, partCount: document.parts.length})
  const restored = await current.loadRecovery(entries[1]!.id)
  expect(restored).toEqual(document)
  await current.write(createEmptyDocument())
  expect(await first.read()).toEqual(document)
  expect(await current.read()).toMatchObject({parts: []})
  expect(await current.loadRecovery('missing')).toBeNull()
})

test('should find legacy documents and skip invalid records', async () => {
  const database = new IDBFactory()
  const session = createDocumentSession({database, storage: sessionStorage})
  await session.write(createDemoDocument())
  const document = {...createDemoDocument(), motions: []}
  await writeRecord(database, 'legacy', document)
  await writeRecord(database, 'invalid', {parts: 'broken'})
  expect(await session.listRecoveries()).toEqual([
    expect.objectContaining({id: 'legacy', partCount: document.parts.length, savedAt: null}),
  ])
  expect(await session.loadRecovery('legacy')).toEqual(document)
  await expect(session.loadRecovery('invalid')).rejects.toThrow('Recovery document is invalid')
  sessionStorage.setItem('puppet:document-session:v1', 'legacy')
  expect(await createDocumentSession({database, storage: sessionStorage}).read()).toEqual(document)
})

test('should isolate explicit viewer snapshots from editor recovery and preserve them on reload', async () => {
  const database = new IDBFactory()
  const editor = createDocumentSession({database, storage: sessionStorage})
  const editorKey = sessionStorage.getItem('puppet:document-session:v1')
  await editor.write(createEmptyDocument())
  const viewer = createDocumentSession({
    database,
    databaseName: 'puppet-viewer',
    sessionId: 'snapshot',
    storage: sessionStorage,
  })
  const document = createDemoDocument()
  await viewer.write(document)
  const reloaded = createDocumentSession({
    database,
    databaseName: 'puppet-viewer',
    sessionId: 'snapshot',
    storage: sessionStorage,
  })
  expect(await reloaded.read()).toEqual(document)
  expect((await editor.read())?.parts).toHaveLength(0)
  expect(sessionStorage.getItem('puppet:document-session:v1')).toBe(editorKey)
  expect(await editor.listRecoveries()).toEqual([])
})
