import {expect, it} from 'vitest'
import {createPresenceFlag} from '..'
import {createStorage} from './fixtures'

it('should recognize any present string and write the existing marker', () => {
  const storage = createStorage()
  const flag = createPresenceFlag({key: 'entered', storage: () => storage})
  expect(flag.read()).toBe(false)
  storage.setItem('entered', '')
  expect(flag.read()).toBe(true)
  storage.setItem('entered', 'false')
  expect(flag.read()).toBe(true)
  expect(flag.write()).toBe(true)
  expect(storage.getItem('entered')).toBe('true')
})

it('should remain best-effort when storage access is blocked', () => {
  const flag = createPresenceFlag({
    key: 'entered',
    storage: () => {
      throw new Error('blocked')
    },
  })
  expect(flag.read()).toBe(false)
  expect(flag.write()).toBe(false)
})
