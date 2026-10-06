/** @vitest-environment node */

import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {useAsyncTask} from '..'

vi.mock('solid-js', () => vi.importActual<typeof import('solid-js')>('solid-js/dist/server.js'))

it('should remain idle during SSR without invoking its operation or cleanup', () => {
  const task = vi.fn(async () => 1)
  const cleanupResult = vi.fn()
  createRoot((dispose) => {
    const controller = useAsyncTask({cleanupResult, task})
    expect(controller.state()).toEqual({status: 'idle'})
    dispose()
  })
  expect(task).not.toHaveBeenCalled()
  expect(cleanupResult).not.toHaveBeenCalled()
})
