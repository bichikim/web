/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {useApplicationRecovery} from '..'

it('should connect component recovery events to reporting and reload', () => {
  const onReload = vi.fn()
  const reportError = vi.fn(() => 'POMO-REPORTED')
  const error = new Error('render failure')
  const {cleanup, result} = renderHook(() => useApplicationRecovery({onReload, reportError}))

  expect(result.onError(error)).toBe('POMO-REPORTED')
  result.onReload()

  expect(reportError).toHaveBeenCalledWith(error)
  expect(onReload).toHaveBeenCalledOnce()
  cleanup()
})

it('should allow one retry until the recovered component reports readiness', () => {
  const reset = vi.fn()
  const {cleanup, result} = renderHook(() => useApplicationRecovery())

  result.onRetry(reset)
  result.onRetry(reset)

  expect(result.canRetry()).toBe(false)
  expect(reset).toHaveBeenCalledOnce()

  result.onReady()

  expect(result.canRetry()).toBe(true)
  cleanup()
})

it('should return a local error ID when reporting fails', () => {
  const createErrorId = vi.fn(() => 'POMO-FALLBACK')
  const {cleanup, result} = renderHook(() =>
    useApplicationRecovery({
      createErrorId,
      reportError: () => {
        throw new Error('reporter failure')
      },
    }),
  )

  expect(result.onError(new Error('render failure'))).toBe('POMO-FALLBACK')
  expect(createErrorId).toHaveBeenCalledOnce()
  cleanup()
})
