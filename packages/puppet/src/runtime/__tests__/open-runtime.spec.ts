/** @vitest-environment jsdom */
import {IDBFactory} from 'fake-indexeddb'
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../player'
import {createRuntimeDocumentSession} from '../create-runtime-document-session'
import {openRuntime} from '../open-runtime'

afterEach(() => {
  history.replaceState(null, '', '/')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('should persist the current document before switching the same tab with its motion', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  const open = vi.spyOn(globalThis, 'open')
  const document = createDemoDocument()
  await openRuntime({document, motionId: 'idle', page: 'studio'})
  const url = new URL(location.href)
  expect(url.pathname).toBe('/studio')
  expect(url.searchParams.get('motion')).toBe('idle')
  expect(await createRuntimeDocumentSession(url.searchParams.get('session')!).read()).toEqual(
    document,
  )
  expect(open).not.toHaveBeenCalled()
})

test('should keep the current screen when persisting the document fails', async () => {
  const previous = location.href
  vi.stubGlobal('indexedDB', {
    open: () => {
      throw new Error('storage unavailable')
    },
  })
  await expect(openRuntime({document: createDemoDocument()})).rejects.toThrow('storage unavailable')
  expect(location.href).toBe(previous)
})

test('should retain the screen when the handoff was cancelled', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  const previous = location.href
  const request = new AbortController()
  const opening = openRuntime({document: createDemoDocument(), signal: request.signal})
  request.abort()
  await opening
  expect(location.href).toBe(previous)
})
