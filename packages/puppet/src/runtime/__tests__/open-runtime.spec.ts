/** @vitest-environment jsdom */
import {IDBFactory} from 'fake-indexeddb'
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../player'
import {createRuntimeDocumentSession} from '../create-runtime-document-session'
import {openRuntime} from '../open-runtime'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('should persist the current document before navigating the popup with its motion', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  const replace = vi.fn()
  const close = vi.fn()
  const popup = {close, location: {replace}, opener: globalThis}
  vi.spyOn(globalThis, 'open').mockReturnValue(popup as unknown as Window)
  const document = createDemoDocument()
  await openRuntime({document, motionId: 'idle'})
  const url = new URL(replace.mock.calls[0]![0])
  expect(url.pathname).toBe('/viewer')
  expect(url.searchParams.get('motion')).toBe('idle')
  expect(await createRuntimeDocumentSession(url.searchParams.get('session')!).read()).toEqual(
    document,
  )
  expect(popup.opener).toBeNull()
  expect(close).not.toHaveBeenCalled()
})

test('should report popup blocking without saving or navigating', async () => {
  vi.spyOn(globalThis, 'open').mockReturnValue(null)
  await expect(openRuntime({document: createDemoDocument()})).rejects.toThrow('팝업을 허용')
})
