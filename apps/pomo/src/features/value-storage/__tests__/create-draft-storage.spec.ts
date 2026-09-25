import {afterEach, expect, it, vi} from 'vitest'
import {createDraftStorage, createJsonCodec} from '..'
import {createStorage} from './fixtures'

const messages = {delete: 'delete failed', read: 'read failed', write: 'write failed'}

afterEach(() => vi.restoreAllMocks())

it('should round-trip and delete drafts without validating writes', () => {
  const storage = createStorage()
  const parse = vi.fn((value: unknown) => (typeof value === 'string' ? value : null))
  const draft = createDraftStorage({
    key: 'draft',
    storage: () => storage,
    ...createJsonCodec(parse),
    messages,
  })
  expect(draft.read()).toBeNull()
  draft.write('text')
  expect(parse).not.toHaveBeenCalled()
  expect(draft.read()).toBe('text')
  draft.delete()
  expect(draft.read()).toBeNull()
})

it('should distinguish invalid schema values from malformed JSON warnings', () => {
  const storage = createStorage()
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const draft = createDraftStorage({
    key: 'draft',
    storage: () => storage,
    ...createJsonCodec((value) => (typeof value === 'string' ? value : null)),
    messages,
  })
  storage.setItem('draft', '42')
  expect(draft.read()).toBeNull()
  expect(warning).not.toHaveBeenCalled()
  storage.setItem('draft', '{bad')
  expect(draft.read()).toBeNull()
  expect(warning).toHaveBeenCalledExactlyOnceWith(messages.read, expect.any(SyntaxError))
})

it('should tolerate a failing storage resolver and preserve operation-specific warnings', () => {
  const failure = new Error('blocked')
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const draft = createDraftStorage({
    decode: String,
    encode: String,
    key: 'draft',
    messages,
    storage: () => {
      throw failure
    },
  })
  expect(draft.read()).toBeNull()
  expect(() => draft.write('text')).not.toThrow()
  expect(() => draft.delete()).not.toThrow()
  expect(warning.mock.calls).toEqual([
    [messages.read, failure],
    [messages.write, failure],
    [messages.delete, failure],
  ])
})

it('should route failures to a supplied reporter without logging', () => {
  const failure = new Error('blocked')
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const reportError = vi.fn()
  const draft = createDraftStorage({
    decode: String,
    encode: String,
    key: 'draft',
    messages,
    reportError,
    storage: () => {
      throw failure
    },
  })
  expect(draft.read()).toBeNull()
  draft.write('text')
  draft.delete()
  expect(reportError.mock.calls).toEqual([
    [messages.read, failure],
    [messages.write, failure],
    [messages.delete, failure],
  ])
  expect(warning).not.toHaveBeenCalled()
})
