import {expect, it, vi} from 'vitest'
import {createValueStorage} from '..'
import {createStorage} from './fixtures'

it('should bind a key and codec without accessing storage during construction', () => {
  const storage = createStorage()
  const resolve = vi.fn(() => storage)
  const decode = vi.fn(Number)
  const value = createValueStorage({decode, encode: String, key: 'count', storage: resolve})
  expect(resolve).not.toHaveBeenCalled()
  expect(value.read()).toBeNull()
  expect(decode).not.toHaveBeenCalled()
  value.write(42)
  expect(storage.getItem('count')).toBe('42')
  expect(value.read()).toBe(42)
  expect(decode).toHaveBeenCalledExactlyOnceWith('42')
})

it('should resolve the storage per operation and isolate keys', () => {
  const first = createStorage()
  const second = createStorage()
  let current = first
  const value = createValueStorage({
    decode: String,
    encode: String,
    key: 'one',
    storage: () => current,
  })
  value.write('first')
  current = second
  expect(value.read()).toBeNull()
  value.write('second')
  expect(first.getItem('one')).toBe('first')
  expect(second.getItem('one')).toBe('second')
  expect(second.getItem('other')).toBeNull()
})

it('should propagate storage and codec failures to the policy owner', () => {
  const failure = new Error('unavailable')
  const value = createValueStorage({
    decode: String,
    encode: String,
    key: 'one',
    storage: () => {
      throw failure
    },
  })
  expect(() => value.read()).toThrow(failure)
  expect(() => value.write('text')).toThrow(failure)
  const storage = createStorage()
  storage.setItem('one', 'text')
  const broken = createValueStorage<string>({
    decode: () => {
      throw failure
    },
    encode: () => {
      throw failure
    },
    key: 'one',
    storage: () => storage,
  })
  expect(() => broken.read()).toThrow(failure)
  expect(() => broken.write('text')).toThrow(failure)
  expect(storage.getItem('one')).toBe('text')
})
