import {describe, expect, it} from 'vitest'
import {createRoot} from 'solid-js'
import {useIsMounted} from './'

describe('useIsMounted', () => {
  it('should return false initially and true after mount', () => {
    const {dispose, mounted} = createRoot((dispose) => {
      const mounted = useIsMounted()

      expect(mounted()).toBe(false)

      return {dispose, mounted}
    })

    expect(mounted()).toBe(true)
    dispose()
  })
})
