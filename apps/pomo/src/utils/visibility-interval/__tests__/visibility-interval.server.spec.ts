/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {visibilityInterval} from '..'

it('should not start an interval during server rendering', () => {
  const callback = vi.fn()
  const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
  const stop = visibilityInterval(callback, 1000)

  expect(setIntervalSpy).not.toHaveBeenCalled()
  stop()
  setIntervalSpy.mockRestore()
})
