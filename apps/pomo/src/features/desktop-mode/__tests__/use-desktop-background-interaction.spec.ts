/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {getDesktopBackgroundInteraction, setDesktopBackgroundInteraction} from '../runtime'
import {useDesktopBackgroundInteraction} from '../use-desktop-background-interaction'

vi.mock('../runtime', () => ({
  getDesktopBackgroundInteraction: vi.fn(),
  setDesktopBackgroundInteraction: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getDesktopBackgroundInteraction).mockReset().mockResolvedValue('interactive')
  vi.mocked(setDesktopBackgroundInteraction).mockReset().mockResolvedValue()
})

afterEach(() => vi.clearAllMocks())

it('should start interactive and publish successful changes', async () => {
  const view = renderHook(() => useDesktopBackgroundInteraction())

  expect(view.result.interaction()).toBe('interactive')
  await view.result.onInteractionChange('passThrough')

  expect(setDesktopBackgroundInteraction).toHaveBeenCalledWith('passThrough')
  expect(view.result.interaction()).toBe('passThrough')
  expect(view.result.error()).toBeNull()
})

it('should suppress duplicate requests and expose native failures', async () => {
  const view = renderHook(() => useDesktopBackgroundInteraction())

  await view.result.onInteractionChange('interactive')
  expect(setDesktopBackgroundInteraction).not.toHaveBeenCalled()

  vi.mocked(setDesktopBackgroundInteraction).mockRejectedValueOnce(new Error('native failed'))
  await expect(view.result.onInteractionChange('passThrough')).rejects.toThrow('native failed')

  expect(view.result.interaction()).toBe('interactive')
  expect(view.result.error()).toBe('native failed')
  expect(view.result.isChanging()).toBe(false)
})

it('should restore the active native interaction after the control window reloads', async () => {
  vi.mocked(getDesktopBackgroundInteraction).mockResolvedValueOnce('passThrough')

  const view = renderHook(() => useDesktopBackgroundInteraction())

  await vi.waitFor(() => expect(view.result.interaction()).toBe('passThrough'))
})

it('should preserve a newer user change when the initial native query resolves late', async () => {
  let finishQuery: ((interaction: 'interactive') => void) | undefined
  vi.mocked(getDesktopBackgroundInteraction).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishQuery = resolve
      }),
  )
  const view = renderHook(() => useDesktopBackgroundInteraction())

  await view.result.onInteractionChange('passThrough')
  finishQuery?.('interactive')
  await Promise.resolve()

  expect(view.result.interaction()).toBe('passThrough')
})

it('should ignore a late initial query failure after a newer user change', async () => {
  let rejectQuery: ((error: unknown) => void) | undefined
  vi.mocked(getDesktopBackgroundInteraction).mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectQuery = reject
      }),
  )
  const view = renderHook(() => useDesktopBackgroundInteraction())

  await view.result.onInteractionChange('passThrough')
  rejectQuery?.(new Error('stale native failure'))
  await Promise.resolve()

  expect(view.result.interaction()).toBe('passThrough')
  expect(view.result.error()).toBeNull()
})

it('should expose a structured native interaction query failure', async () => {
  vi.mocked(getDesktopBackgroundInteraction).mockRejectedValueOnce({
    code: 'invalid-surface-state',
    message: 'background is not active',
  })

  const view = renderHook(() => useDesktopBackgroundInteraction())

  await vi.waitFor(() => expect(view.result.error()).toBe('background is not active'))
})

it('should ignore an initial query failure after a newer interaction change', async () => {
  let failQuery: ((reason?: unknown) => void) | undefined
  vi.mocked(getDesktopBackgroundInteraction).mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        failQuery = reject
      }),
  )
  const view = renderHook(() => useDesktopBackgroundInteraction())

  await view.result.onInteractionChange('passThrough')
  failQuery?.(new Error('stale query failed'))
  await Promise.resolve()

  expect(view.result.interaction()).toBe('passThrough')
  expect(view.result.error()).toBeNull()
})

it('should ignore an initial query failure after cleanup', async () => {
  let failQuery: ((reason?: unknown) => void) | undefined
  vi.mocked(getDesktopBackgroundInteraction).mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        failQuery = reject
      }),
  )
  const view = renderHook(() => useDesktopBackgroundInteraction())

  view.cleanup()
  failQuery?.(new Error('disposed query failed'))
  await Promise.resolve()

  expect(view.result.error()).toBeNull()
})
