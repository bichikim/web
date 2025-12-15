import {describe, expect, it} from 'vitest'
import {createRoot} from 'solid-js'
import {useIsCleanup} from './'

describe('useIsCleanup', () => {
  it('should return false initially and true after cleanup', () => {
    const {dispose, isCleanup} = createRoot((dispose) => {
      const isCleanup = useIsCleanup()

      expect(isCleanup()).toBe(false)

      return {dispose, isCleanup}
    })

    expect(isCleanup()).toBe(false)
    dispose()
    expect(isCleanup()).toBe(true)
  })
})
