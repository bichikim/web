import {expect, it, vi} from 'vitest'
import {createParsedPreferenceStorage} from '..'

const parse = (value: unknown) => (typeof value === 'number' ? value : null)

it('should validate writes while preserving synchronous results and decoded reads', () => {
  const failure = new Error('write failed')
  const write = vi.fn(() => failure)
  const read = vi.fn(() => 0)
  const storage = createParsedPreferenceStorage({
    invalidMessage: 'Invalid number.',
    parse,
    read,
    write,
  })
  expect(storage.read('key')).toBe(0)
  expect(read).toHaveBeenCalledExactlyOnceWith('key')
  expect(storage.write('key', false)).toEqual(new Error('Invalid number.'))
  expect(write).not.toHaveBeenCalled()
  expect(storage.write('key', 0)).toBe(failure)
  expect(write).toHaveBeenCalledExactlyOnceWith(0, 'key')
})

it('should preserve promises and rejected writes without wrapping their failures', async () => {
  const failure = new Error('native write failed')
  const read = Promise.resolve(2)
  const write = Promise.reject(failure)
  const storage = createParsedPreferenceStorage({
    invalidMessage: 'Invalid number.',
    parse,
    read: () => read,
    write: () => write,
  })
  expect(storage.read('key')).toBe(read)
  const result = storage.write('key', 2)
  expect(result).toBe(write)
  await expect(result).rejects.toBe(failure)
})

it('should preserve thrown parser and persistence errors', () => {
  const failure = new Error('unexpected')
  const storage = createParsedPreferenceStorage({
    invalidMessage: 'Invalid number.',
    parse: (value) => {
      if (value === null) {
        throw failure
      }
      return parse(value)
    },
    read: () => null,
    write: () => {
      throw failure
    },
  })
  expect(() => storage.write('key', null)).toThrow(failure)
  expect(() => storage.write('key', 1)).toThrow(failure)
})

it('should forward subscription callbacks and cleanup without adding subscriptions', () => {
  const cleanup = vi.fn()
  const subscribe = vi.fn(() => cleanup)
  const storage = createParsedPreferenceStorage({
    invalidMessage: 'Invalid number.',
    parse,
    read: () => null,
    subscribe,
    write: () => null,
  })
  expect(subscribe).not.toHaveBeenCalled()
  const changed = vi.fn()
  expect(storage.subscribe?.(changed)).toBe(cleanup)
  expect(subscribe).toHaveBeenCalledExactlyOnceWith(changed)
})
