/** @vitest-environment node */

import {createRoot} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import {useCapabilityTask} from '..'

// Exercise the server lifecycle implementation, even when the runner uses browser resolution.
vi.mock('solid-js', () => vi.importActual<typeof import('solid-js')>('solid-js/dist/server.js'))

describe('useCapabilityTask SSR', () => {
  it('should retain the neutral state without probing or executing browser capabilities', async () => {
    const capability = vi.fn(() => {
      throw new Error('browser capability accessed during SSR')
    })
    const task = vi.fn(async () => 1)
    const controller = createRoot(() => useCapabilityTask({capability, task}))

    expect(controller.availability()).toBe('checking')
    expect(controller.state()).toEqual({status: 'idle'})
    await expect(controller.execute()).resolves.toBeUndefined()
    expect(capability).not.toHaveBeenCalled()
    expect(task).not.toHaveBeenCalled()
  })
})
