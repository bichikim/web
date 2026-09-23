import {afterEach, expect, it, vi} from 'vitest'
import {createCollectionStorage} from '..'
import {createStorage} from './fixtures'

afterEach(() => vi.restoreAllMocks())

const parse = (value: unknown): readonly string[] => {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new TypeError('Expected strings')
  }
  return value
}

it('should validate, persist, and then announce the completed write', () => {
  const storage = createStorage()
  const changed = vi.fn(() => expect(storage.getItem('items')).toBe('["one"]'))
  const items = createCollectionStorage({
    key: 'items',
    onChange: changed,
    parse,
    readFailureMessage: 'read failed',
    storage: () => storage,
  })
  expect(items.read()).toEqual([])
  items.write(['one'])
  expect(items.read()).toEqual(['one'])
  expect(changed).toHaveBeenCalledOnce()
})

it('should return an empty collection and report invalid stored data', () => {
  const storage = createStorage()
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const items = createCollectionStorage({
    key: 'items',
    onChange: vi.fn(),
    parse,
    readFailureMessage: 'read failed',
    storage: () => storage,
  })
  storage.setItem('items', '{}')
  expect(items.read()).toEqual([])
  expect(warning).toHaveBeenCalledWith('read failed', expect.any(TypeError))
  storage.setItem('items', '{bad')
  expect(items.read()).toEqual([])
  expect(warning).toHaveBeenLastCalledWith('read failed', expect.any(SyntaxError))
})

it('should propagate write failures without announcing an unsaved collection', () => {
  const changed = vi.fn()
  const failure = new Error('blocked')
  const items = createCollectionStorage({
    key: 'items',
    onChange: changed,
    parse,
    readFailureMessage: 'read failed',
    storage: () => {
      throw failure
    },
  })
  expect(() => items.write(['one'])).toThrow(failure)
  expect(changed).not.toHaveBeenCalled()
})

it('should validate writes before resolving storage and preserve notification failures', () => {
  const resolve = vi.fn(createStorage)
  const failure = new Error('invalid')
  const rejected = createCollectionStorage({
    key: 'items',
    onChange: vi.fn(),
    parse: () => {
      throw failure
    },
    readFailureMessage: 'read failed',
    storage: resolve,
  })
  expect(() => rejected.write([])).toThrow(failure)
  expect(resolve).not.toHaveBeenCalled()
  const storage = createStorage()
  const items = createCollectionStorage({
    key: 'items',
    onChange: () => {
      throw failure
    },
    parse,
    readFailureMessage: 'read failed',
    storage: () => storage,
  })
  expect(() => items.write(['saved'])).toThrow(failure)
  expect(storage.getItem('items')).toBe('["saved"]')
})
