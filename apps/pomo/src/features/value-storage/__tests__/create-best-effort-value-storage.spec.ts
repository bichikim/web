import {expect, it} from 'vitest'
import {createBestEffortValueStorage} from '..'
import {createStorage} from './fixtures'

it('should keep value storage available while ignoring read and write failures', () => {
  const storage = createStorage()
  const value = createBestEffortValueStorage({
    decode: Number,
    encode: String,
    key: 'count',
    storage: () => storage,
  })
  value.write(2)
  expect(value.read()).toBe(2)

  const blocked = createBestEffortValueStorage<number>({
    decode: Number,
    encode: String,
    key: 'count',
    storage: () => {
      throw new Error('blocked')
    },
  })
  expect(blocked.read()).toBeNull()
  expect(() => blocked.write(3)).not.toThrow()
})
