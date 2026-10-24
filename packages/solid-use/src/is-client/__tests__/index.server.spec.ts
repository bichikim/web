/** @vitest-environment node */

import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import {useIsClient} from '../index'

vi.mock('solid-js/web', () => ({isServer: true}))

describe('useIsClient server', () => {
  it('should remain false before and after root setup when Solid selects its server export', () => {
    const api = createRoot((dispose) => {
      const isClient = useIsClient()
      expect(isClient()).toBe(false)
      return {dispose, isClient}
    })
    try {
      expect(api.isClient()).toBe(false)
    } finally {
      api.dispose()
    }
  })
})
