/** @vitest-environment jsdom */
import {afterEach, expect, it, vi} from 'vitest'
import {localDateRuntime} from '../local-date-runtime'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('should invoke the scheduled callback after the delay', () => {
  vi.useFakeTimers()
  const callback = vi.fn()
  const cancel = localDateRuntime.schedule(callback, 1000)
  vi.advanceTimersByTime(999)
  expect(callback).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  expect(callback).toHaveBeenCalledOnce()
  cancel()
})

it('should not invoke the scheduled callback after cancel', () => {
  vi.useFakeTimers()
  const callback = vi.fn()
  const cancel = localDateRuntime.schedule(callback, 1000)
  cancel()
  vi.advanceTimersByTime(1000)
  expect(callback).not.toHaveBeenCalled()
})

it('should notify the subscriber with the document hidden state', () => {
  let documentHidden = false
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => documentHidden)
  const callback = vi.fn()
  const stop = localDateRuntime.subscribe(callback)
  documentHidden = true
  document.dispatchEvent(new Event('visibilitychange'))
  expect(callback).toHaveBeenCalledTimes(1)
  expect(callback).toHaveBeenLastCalledWith(true)
  stop()
  documentHidden = false
  document.dispatchEvent(new Event('visibilitychange'))
  expect(callback).toHaveBeenCalledTimes(1)
})
