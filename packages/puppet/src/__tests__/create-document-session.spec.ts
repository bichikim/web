/** @vitest-environment jsdom */
import {IDBFactory} from 'fake-indexeddb'
import {beforeEach, expect, test} from 'vitest'
import {createDocumentSession} from '../create-document-session'
import {createDemoDocument} from '../player'

beforeEach(() => sessionStorage.clear())

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
  expect(sessionStorage.getItem(sessionStorage.key(0)!)).not.toContain('winter-love-puppet')
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
