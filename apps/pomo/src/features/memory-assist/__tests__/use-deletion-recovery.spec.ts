/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {useDeletionRecovery} from '../use-deletion-recovery'

const retry = vi.hoisted(() => vi.fn())
vi.mock('../deletion', () => ({retryMemoryMemoDeletions: retry}))

beforeEach(() => {
  vi.useFakeTimers()
  retry.mockReset().mockResolvedValue(undefined)
})
afterEach(() => vi.useRealTimers())

it('should retry on mount, interval and visibility, then stop on disposal', async () => {
  const deleteDialogue = vi.fn()
  const view = renderHook(() => useDeletionRecovery(deleteDialogue))
  expect(retry).toHaveBeenCalledExactlyOnceWith(deleteDialogue)
  await vi.advanceTimersByTimeAsync(300_000)
  expect(retry).toHaveBeenCalledTimes(2)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
  expect(retry).toHaveBeenCalledTimes(2)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  document.dispatchEvent(new Event('visibilitychange'))
  expect(retry).toHaveBeenCalledTimes(3)
  view.cleanup()
  document.dispatchEvent(new Event('visibilitychange'))
  await vi.advanceTimersByTimeAsync(300_000)
  expect(retry).toHaveBeenCalledTimes(3)
})

it('should retry on the next interval after storage recovery fails', async () => {
  const error = new Error('native read failed')
  retry.mockRejectedValueOnce(error)
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const view = renderHook(() => useDeletionRecovery(vi.fn()))
  await vi.advanceTimersByTimeAsync(300_000)
  expect(log).toHaveBeenCalledWith('Failed to retry memory memo deletions.', error)
  expect(retry).toHaveBeenCalledTimes(2)
  view.cleanup()
})
