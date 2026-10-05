/** @vitest-environment node */

import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import {useFullscreen} from '..'

// Exercise the server lifecycle implementation without a DOM.
vi.mock('solid-js', () => vi.importActual<typeof import('solid-js')>('solid-js/dist/server.js'))

describe('useFullscreen SSR', () => {
  it('should expose the same neutral state as the initial client render without document access', async () => {
    const controller = createRoot(() => useFullscreen())

    expect(controller.availability()).toBe('checking')
    expect(controller.isEnabled()).toBe(false)
    expect(controller.isRequestPending()).toBe(false)
    expect(controller.error()).toBeNull()
    await expect(controller.onEnabledChange(true)).resolves.toBeUndefined()
    expect(controller.isEnabled()).toBe(false)
  })
})
