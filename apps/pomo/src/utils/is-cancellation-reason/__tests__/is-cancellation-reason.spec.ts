import {expect, it} from 'vitest'

import {isAbortError, isCancellationReason} from '../is-cancellation-reason'

it('should identify AbortError by its name without requiring one Error class', () => {
  expect(isAbortError(new DOMException('stopped', 'AbortError'))).toBe(true)
  expect(isAbortError({name: 'AbortError'})).toBe(true)
  expect(isAbortError(new Error('stopped'))).toBe(false)
  expect(isAbortError(null)).toBe(false)
})

it('should identify the exact reason of an aborted signal', () => {
  const controller = new AbortController()
  const reason = {kind: 'cancelled'}
  expect(isCancellationReason(reason, controller.signal)).toBe(false)
  controller.abort(reason)
  expect(isCancellationReason(reason, controller.signal)).toBe(true)
  expect(isCancellationReason({kind: 'cancelled'}, controller.signal)).toBe(false)
})
