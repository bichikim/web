/** @vitest-environment node */

import {createRoot, onMount} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useInactivity} from '..'

// Exercise the server runtime despite the unit project's browser resolution condition.
vi.mock('solid-js', () => vi.importActual<typeof import('solid-js')>('solid-js/dist/server.js'))
vi.mock('solid-js/web', () => ({isServer: true}))

afterEach(() => vi.restoreAllMocks())

it('should keep SSR inactive without DOM access or timers even when commands are called', () => {
  const schedule = vi.spyOn(globalThis, 'setTimeout')
  const timeoutMs = vi.fn(() => 1000)
  createRoot((dispose) => {
    const result = useInactivity({timeoutMs})
    onMount(result.start)
    result.start()
    result.reset()
    result.wake()
    result.stop()
    expect(result.inactive()).toBe(false)
    dispose()
    result.start()
    result.reset()
    result.stop()
    result.wake()
    expect(result.inactive()).toBe(false)
  })
  expect(schedule).not.toHaveBeenCalled()
  expect(timeoutMs).not.toHaveBeenCalled()
})
