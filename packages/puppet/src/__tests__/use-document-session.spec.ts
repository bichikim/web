/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {createDocumentSession} from '../create-document-session'
import {createDemoDocument} from '../player'
import {useDocumentSession} from '../use-document-session'

vi.mock('../create-document-session', () => ({createDocumentSession: vi.fn()}))

afterEach(() => {
  vi.resetAllMocks()
  vi.restoreAllMocks()
})

test('should prefer the restored document over the initial example', async () => {
  const restored = createDemoDocument()
  vi.mocked(createDocumentSession).mockReturnValue({
    read: vi.fn().mockResolvedValue(restored),
    write: vi.fn(),
  })
  const loadInitialDocument = vi.fn()
  const {result} = renderHook(() => useDocumentSession({loadInitialDocument}))
  await waitFor(() => expect(result.document()).toBe(restored))
  expect(loadInitialDocument).not.toHaveBeenCalled()
  expect(result.failure()).toBeNull()
})

test('should write the latest queued edit after the current write finishes', async () => {
  const document = createDemoDocument()
  let finish = () => undefined as void
  const pending = new Promise<void>((resolve) => {
    finish = resolve
  })
  const write = vi.fn().mockReturnValueOnce(pending).mockResolvedValue(undefined)
  vi.mocked(createDocumentSession).mockReturnValue({read: vi.fn().mockResolvedValue(null), write})
  const {result} = renderHook(() => useDocumentSession({loadInitialDocument: async () => document}))
  await waitFor(() => expect(result.document()).toBe(document))
  const first = result.save(document)
  await Promise.resolve()
  const intermediate = {...document, motions: []}
  const latest = {...document, parts: []}
  const second = result.save(intermediate)
  const third = result.save(latest)
  expect(result.failure()).toBeNull()
  finish()
  await Promise.all([first, second, third])
  expect(write.mock.calls).toEqual([[document], [latest]])
  expect(result.failure()).toBeNull()
})

test('should report a failed write and allow the next edit to be saved', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const document = createDemoDocument()
  const write = vi.fn().mockRejectedValueOnce(new Error('quota')).mockResolvedValue(undefined)
  vi.mocked(createDocumentSession).mockReturnValue({read: vi.fn().mockResolvedValue(null), write})
  const {result} = renderHook(() => useDocumentSession({loadInitialDocument: async () => document}))
  await waitFor(() => expect(result.document()).toBe(document))
  await result.save(document)
  expect(result.failure()).toBe('save')
  await result.save({...document, motions: []})
  expect(result.failure()).toBeNull()
})

test('should discard queued edits when the editor is disposed', async () => {
  const document = createDemoDocument()
  let finish = () => undefined as void
  const pending = new Promise<void>((resolve) => {
    finish = resolve
  })
  const write = vi.fn().mockReturnValueOnce(pending).mockResolvedValue(undefined)
  vi.mocked(createDocumentSession).mockReturnValue({read: vi.fn().mockResolvedValue(null), write})
  const {result, cleanup} = renderHook(() =>
    useDocumentSession({loadInitialDocument: async () => document}),
  )
  await waitFor(() => expect(result.document()).toBe(document))
  const first = result.save(document)
  await Promise.resolve()
  const queued = result.save({...document, motions: []})
  cleanup()
  finish()
  await Promise.all([first, queued])
  expect(write.mock.calls).toEqual([[document]])
})

test('should still open the initial document when browser storage is unavailable', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.mocked(createDocumentSession).mockImplementation(() => {
    throw new Error('storage denied')
  })
  const document = createDemoDocument()
  const {result} = renderHook(() => useDocumentSession({loadInitialDocument: async () => document}))
  await waitFor(() => expect(result.document()).toBe(document))
  await result.save(document)
  expect(result.failure()).toBe('restore')
})

test('should suppress repeated failed writes after dismissal until saving recovers', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const document = createDemoDocument()
  const write = vi
    .fn()
    .mockRejectedValueOnce(new Error('quota'))
    .mockRejectedValueOnce(new Error('quota'))
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error('quota'))
  vi.mocked(createDocumentSession).mockReturnValue({read: vi.fn().mockResolvedValue(null), write})
  const {result} = renderHook(() => useDocumentSession({loadInitialDocument: async () => document}))
  await waitFor(() => expect(result.document()).toBe(document))
  await result.save(document)
  expect(result.failure()).toBe('save')
  result.dismissFailure()
  expect(result.failure()).toBeNull()
  await result.save(document)
  expect(result.failure()).toBeNull()
  await result.save(document)
  await result.save(document)
  expect(result.failure()).toBe('save')
})
