/** @vitest-environment node */

import {expect, it} from 'vitest'

import {
  type DesktopModeStorage,
  readCleanExitStorage,
  readDesktopModeStorage,
  writeCleanExitStorage,
  writeDesktopModeStorage,
} from '../storage'

const createStorage = (): DesktopModeStorage => {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

it('should persist desktop mode and clean-exit state through one injected store', () => {
  const storage = createStorage()

  writeDesktopModeStorage('widget', storage)
  writeCleanExitStorage(true, storage)

  expect(readDesktopModeStorage(storage)).toBe('widget')
  expect(readCleanExitStorage(storage)).toBe(true)
})

it('should preserve fallback behavior when an injected store fails', () => {
  const storage: DesktopModeStorage = {
    getItem: () => {
      throw new Error('read denied')
    },
    setItem: () => {
      throw new Error('write denied')
    },
  }

  expect(readDesktopModeStorage(storage)).toBe('normal')
  expect(readCleanExitStorage(storage)).toBe(false)
  expect(() => writeDesktopModeStorage('desktop', storage)).not.toThrow()
  expect(() => writeCleanExitStorage(true, storage)).not.toThrow()
})
