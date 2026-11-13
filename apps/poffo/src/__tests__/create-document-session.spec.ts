/** @vitest-environment jsdom */
import {IDBFactory, IDBKeyRange, IDBObjectStore} from 'fake-indexeddb'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createDocumentSession} from '../create-document-session'
import {
  compactDocumentTextures,
  createDemoDocument,
  createEmptyDocument,
  PUPPET_DOCUMENT_FORMAT,
} from '@winter-love/puppet/player'

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal('IDBKeyRange', IDBKeyRange)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const writeRecord = (factory: IDBFactory, id: IDBValidKey, value: unknown): Promise<void> =>
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

test('should store shared embedded textures once and restore the original parts', async () => {
  const put = vi.spyOn(IDBObjectStore.prototype, 'put')
  const demo = createDemoDocument()
  const document = {
    ...demo,
    parts: demo.parts.map((part) => ({...part, texture: demo.parts[0]!.texture})),
  }
  const session = createDocumentSession({database: new IDBFactory(), storage: sessionStorage})
  await session.write(document)
  const chunks = put.mock.calls.flatMap(([value, key]) =>
    Array.isArray(key) && typeof value === 'string' ? [value] : [],
  )
  expect(JSON.parse(chunks.join(''))).toMatchObject({
    parts: document.parts.map((part) => ({id: part.id, texture: {assetId: 'texture-0'}})),
    textureAssets: {'texture-0': demo.parts[0]!.texture.src},
  })
  expect((await session.read())?.parts).toEqual(document.parts)
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

test('should timestamp each saved snapshot with the supplied clock and retain it on restore', async () => {
  const database = new IDBFactory()
  const now = vi.fn<() => number>().mockReturnValueOnce(0).mockReturnValueOnce(2000)
  const session = createDocumentSession({
    database,
    now,
    sessionId: 'saved',
    storage: sessionStorage,
  })
  const observer = createDocumentSession({database, sessionId: 'observer', storage: sessionStorage})
  const document = createDemoDocument()
  await session.write(document)
  expect(await observer.listRecoveries()).toEqual([
    {
      id: 'saved',
      motionCount: document.motions.length,
      partCount: document.parts.length,
      savedAt: 0,
    },
  ])
  const edited = {...document, motions: []}
  await session.write(edited)
  expect(await observer.loadRecovery('saved')).toEqual(edited)
  expect(await observer.listRecoveries()).toEqual([
    {id: 'saved', motionCount: 0, partCount: document.parts.length, savedAt: 2000},
  ])
  expect(now).toHaveBeenCalledTimes(2)
})

test.each([NaN, Infinity, -Infinity])(
  'should retain the last recovery when the clock returns %s and allow a later valid write',
  async (timestamp) => {
    const database = new IDBFactory()
    const now = vi
      .fn<() => number>()
      .mockReturnValueOnce(1234)
      .mockReturnValueOnce(timestamp)
      .mockReturnValue(2345)
    const session = createDocumentSession({
      database,
      now,
      sessionId: 'saved',
      storage: sessionStorage,
    })
    const previous = createDemoDocument()
    await session.write(previous)
    const edited = {...previous, motions: []}
    const error: unknown = await session.write(edited).catch((cause: unknown) => cause)
    const restored = await session.read().catch((cause: unknown) => cause)
    expect(restored).toEqual(previous)
    expect(error).toBeInstanceOf(RangeError)
    await session.write(edited)
    expect(await session.read()).toEqual(edited)
    const observer = createDocumentSession({
      database,
      sessionId: 'observer',
      storage: sessionStorage,
    })
    expect(await observer.listRecoveries()).toEqual([
      {id: 'saved', motionCount: 0, partCount: previous.parts.length, savedAt: 2345},
    ])
  },
)

test('should preserve the recovery and propagate a clock error without preventing the next save', async () => {
  const database = new IDBFactory()
  const failure = new Error('clock unavailable')
  const now = vi
    .fn<() => number>()
    .mockReturnValueOnce(1234)
    .mockImplementationOnce(() => {
      throw failure
    })
    .mockReturnValue(2345)
  const session = createDocumentSession({database, now, storage: sessionStorage})
  const document = createDemoDocument()
  await session.write(document)
  await expect(session.write(createEmptyDocument())).rejects.toBe(failure)
  expect(await session.read()).toEqual(document)
  await session.write(createEmptyDocument())
  expect(await session.read()).toEqual(createEmptyDocument())
})

test('should use the current Unix timestamp when no clock is supplied', async () => {
  const database = new IDBFactory()
  const session = createDocumentSession({database, sessionId: 'saved', storage: sessionStorage})
  const observer = createDocumentSession({database, sessionId: 'observer', storage: sessionStorage})
  const before = Date.now()
  await session.write(createEmptyDocument())
  const after = Date.now()
  const entries = await observer.listRecoveries()
  expect(entries).toHaveLength(1)
  expect(entries[0]?.savedAt).toBeGreaterThanOrEqual(before)
  expect(entries[0]?.savedAt).toBeLessThanOrEqual(after)
})

test('should find other tabs newest first and restore without overwriting their documents', async () => {
  const database = new IDBFactory()
  const now = vi.fn<() => number>().mockReturnValue(1000)
  const first = createDocumentSession({database, now, storage: sessionStorage})
  const document = createDemoDocument()
  await first.write(document)
  sessionStorage.clear()
  now.mockReturnValue(2000)
  const second = createDocumentSession({database, now, storage: sessionStorage})
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

test('should read the previous compact envelope and its recovery metadata', async () => {
  const database = new IDBFactory()
  const session = createDocumentSession({database, storage: sessionStorage})
  await session.read()
  const document = createDemoDocument()
  await writeRecord(database, 'envelope', {
    document: compactDocumentTextures(document),
    savedAt: 1234,
  })
  expect(await session.loadRecovery('envelope')).toEqual(document)
  expect(await session.listRecoveries()).toEqual([
    {
      id: 'envelope',
      motionCount: document.motions.length,
      partCount: document.parts.length,
      savedAt: 1234,
    },
  ])
})

const createLargeDocument = () => {
  const document = createDemoDocument()
  return {
    ...document,
    parts: document.parts.map((part, index) =>
      index === 0
        ? {
            ...part,
            texture: {...part.texture, src: `data:image/png;base64,${'a'.repeat(5 * 1024 * 1024)}`},
          }
        : part,
    ),
  }
}

test('should restore a document exceeding the per-value storage limit without changing the input', async () => {
  const original = IDBObjectStore.prototype.put
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(
    function putRecord(this: IDBObjectStore, value, key) {
      if (JSON.stringify(value).length > 4 * 1024 * 1024 + 65536) {
        throw new DOMException('record too large', 'DataCloneError')
      }
      return original.call(this, value, key)
    },
  )
  const session = createDocumentSession({database: new IDBFactory(), storage: sessionStorage})
  const document = createLargeDocument()
  const texture = document.parts[0]!.texture
  await session.write(document)
  expect((await session.read())?.parts).toEqual(document.parts)
  expect(document.parts[0]!.texture).toBe(texture)
  expect(texture.src).toHaveLength(5 * 1024 * 1024 + 'data:image/png;base64,'.length)
})

test('should preserve the last recovery when a later chunk cannot be written', async () => {
  const database = new IDBFactory()
  const session = createDocumentSession({database, storage: sessionStorage})
  const previous = createDemoDocument()
  await session.write(previous)
  const original = IDBObjectStore.prototype.put
  const failure = new DOMException('disk quota exceeded', 'QuotaExceededError')
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(
    function putRecord(this: IDBObjectStore, value, key) {
      if (Array.isArray(key) && key[1] === 1) {
        throw failure
      }
      return original.call(this, value, key)
    },
  )
  await expect(session.write(createLargeDocument())).rejects.toBe(failure)
  expect(await session.read()).toEqual(previous)
})

test('should reject a recovery with a missing chunk', async () => {
  const database = new IDBFactory()
  const session = createDocumentSession({database, storage: sessionStorage})
  await session.write(createDemoDocument())
  const key = sessionStorage.getItem('puppet:document-session:v1')!
  await writeRecord(database, [key, 0], undefined)
  await expect(session.read()).rejects.toThrow('Recovery document is invalid')
})

test('should reject malformed JSON even when all stored chunk lengths match', async () => {
  const database = new IDBFactory()
  const session = createDocumentSession({database, sessionId: 'current', storage: sessionStorage})
  const document = createDemoDocument()
  await session.write(document)
  const json = JSON.stringify(compactDocumentTextures(document))
  await writeRecord(database, ['current', 0], `!${json.slice(1)}`)
  await expect(session.read()).rejects.toThrow('Recovery document is invalid')
})

test('should reject invalid chunk metadata and omit it from the recovery list', async () => {
  const database = new IDBFactory()
  const session = createDocumentSession({database, storage: sessionStorage})
  await session.read()
  await writeRecord(database, 'invalid', {
    characterCount: 1,
    chunkCount: -1,
    motionCount: 0,
    partCount: 0,
    savedAt: 1234,
    storageFormat: 'json-chunks-v1',
  })
  expect(await session.listRecoveries()).toEqual([])
  await expect(session.loadRecovery('invalid')).rejects.toThrow('Recovery document is invalid')
})

test('should list recovery metadata without reading document chunks', async () => {
  const database = new IDBFactory()
  const first = createDocumentSession({database, sessionId: 'first', storage: sessionStorage})
  const document = createDemoDocument()
  await first.write(document)
  const get = vi.spyOn(IDBObjectStore.prototype, 'get')
  const second = createDocumentSession({database, sessionId: 'second', storage: sessionStorage})
  expect(await second.listRecoveries()).toEqual([
    expect.objectContaining({id: 'first', partCount: document.parts.length}),
  ])
  expect(get.mock.calls.map(([key]) => key)).toEqual(['first'])
})

const readKeys = (factory: IDBFactory): Promise<IDBValidKey[]> =>
  new Promise((resolve, reject) => {
    const request = factory.open('puppet-editor-recovery', 1)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('documents', 'readonly')
      const keys = transaction.objectStore('documents').getAllKeys()
      transaction.oncomplete = () => {
        database.close()
        resolve(keys.result)
      }
      transaction.onabort = () => {
        database.close()
        reject(transaction.error)
      }
    }
    request.onerror = () => reject(request.error)
  })

test('should remove obsolete chunks when replacing a large recovery with a smaller one', async () => {
  const database = new IDBFactory()
  const session = createDocumentSession({database, sessionId: 'current', storage: sessionStorage})
  await session.write(createLargeDocument())
  expect(await readKeys(database)).toContainEqual(['current', 1])
  const document = createDemoDocument()
  await session.write(document)
  expect(await readKeys(database)).toEqual(['current', ['current', 0]])
  expect(await session.read()).toEqual(document)
})

test('should roll back overwritten chunks when an asynchronous storage request fails', async () => {
  const database = new IDBFactory()
  const session = createDocumentSession({database, sessionId: 'current', storage: sessionStorage})
  const previous = createDemoDocument()
  await session.write(previous)
  const original = IDBObjectStore.prototype.put
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(
    function putRecord(this: IDBObjectStore, value, key) {
      return typeof key === 'string' ? this.add(value, key) : original.call(this, value, key)
    },
  )
  await expect(session.write(createEmptyDocument())).rejects.toMatchObject({
    name: 'ConstraintError',
  })
  expect(await session.read()).toEqual(previous)
})

test('should avoid whole-document JSON strings while writing and restoring recovery', async () => {
  const document = createDemoDocument()
  const session = createDocumentSession({database: new IDBFactory(), storage: sessionStorage})
  const stringify = JSON.stringify
  const parse = JSON.parse
  vi.spyOn(JSON, 'stringify').mockImplementation((value, replacer, space) => {
    if (typeof value === 'object' && value !== null) {
      throw new RangeError('Invalid string length')
    }
    return stringify(value, replacer, space)
  })
  vi.spyOn(JSON, 'parse').mockImplementation((text) => {
    if (text.includes(PUPPET_DOCUMENT_FORMAT)) {
      throw new RangeError('Invalid string length')
    }
    return parse(text)
  })
  await session.write(document)
  expect(await session.read()).toEqual(document)
})

test('should bound chunk reads by stored records when metadata overstates the chunk count', async () => {
  const database = new IDBFactory()
  const session = createDocumentSession({database, sessionId: 'current', storage: sessionStorage})
  await session.write(createDemoDocument())
  await writeRecord(database, 'current', {
    characterCount: 4194304 * 64,
    chunkCount: 64,
    motionCount: 3,
    partCount: 3,
    savedAt: 1234,
    storageFormat: 'json-chunks-v1',
  })
  const get = vi.spyOn(IDBObjectStore.prototype, 'get')
  await expect(session.read()).rejects.toThrow('Recovery document is invalid')
  expect(get.mock.calls.filter(([key]) => Array.isArray(key)).length).toBeLessThanOrEqual(1)
})

test('should replace corrupt metadata without issuing deletes for nonexistent chunks', async () => {
  const database = new IDBFactory()
  const session = createDocumentSession({database, sessionId: 'current', storage: sessionStorage})
  await session.write(createDemoDocument())
  await writeRecord(database, 'current', {
    characterCount: 4194304 * 64,
    chunkCount: 64,
    motionCount: 3,
    partCount: 3,
    savedAt: 1234,
    storageFormat: 'json-chunks-v1',
  })
  const remove = vi.spyOn(IDBObjectStore.prototype, 'delete')
  const document = createEmptyDocument()
  await session.write(document)
  expect(await session.read()).toEqual(document)
  expect(remove).toHaveBeenCalledExactlyOnceWith(['current', 0])
})

test('should preserve Unicode pairs split across stored UTF-16 chunk boundaries', async () => {
  const document = {...createEmptyDocument(), motions: [{duration: 1, id: '🐈', tracks: []}]}
  const offset = JSON.stringify(compactDocumentTextures(document)).indexOf('🐈')
  const id = `${'x'.repeat(4194304 - 1 - offset)}🐈tail`
  const source = {...document, motions: [{...document.motions[0]!, id}]}
  const session = createDocumentSession({database: new IDBFactory(), storage: sessionStorage})
  await session.write(source)
  expect((await session.read())?.motions[0]?.id).toBe(id)
})

test('should replace only the selected recovery and clean up actual orphan chunks', async () => {
  const database = new IDBFactory()
  const current = createDocumentSession({database, sessionId: 'current', storage: sessionStorage})
  const sibling = createDocumentSession({
    database,
    sessionId: 'current-other',
    storage: sessionStorage,
  })
  const document = createDemoDocument()
  await current.write(document)
  await sibling.write(document)
  await writeRecord(database, ['current', 7], 'orphan')
  await current.write(createEmptyDocument())
  expect(await readKeys(database)).not.toContainEqual(['current', 7])
  expect(await sibling.read()).toEqual(document)
})
