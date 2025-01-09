/**
 * @vitest-environment jsdom
 */

import {describe, expect, it, vi} from 'vitest'
import {useStorage} from '../'
import {createRoot} from 'solid-js'

describe('useStorage', () => {
  it('should return storage', () => {
    const getItem = vi.spyOn(global.localStorage, 'getItem')
    const setItem = vi.spyOn(global.localStorage, 'setItem')
    const removeItem = vi.spyOn(global.localStorage, 'removeItem')
    const key = 'key'
    const {dispose} = createRoot((dispose) => {
      const storage = useStorage('local', key)

      return {dispose, storage}
    })
    dispose()

    // expect(getItem).toHaveBeenCalled()
    getItem.mockRestore()
    setItem.mockRestore()
    removeItem.mockRestore()
    // expect('').toBe('')
  })
})
