/**
 * @vitest-environment node
 */

import {createRoot} from 'solid-js'
import {useIsClient} from './'
import {describe, expect, it} from 'vitest'

describe('useIsClient', () => {
  it('should return false in server environment', () => {
    const {dispose, isClient} = createRoot((dispose) => {
      const isClient = useIsClient()

      expect(isClient()).toBe(false)

      return {dispose, isClient}
    })

    // onMount always called in client environment
    expect(isClient()).toBe(true)
    dispose()
  })
})
