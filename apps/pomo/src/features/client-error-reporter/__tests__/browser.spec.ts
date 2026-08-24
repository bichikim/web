/** @vitest-environment jsdom */
import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  type ClientErrorContext,
  type ClientErrorReporter,
  createClientErrorReporter,
  installClientErrorHandlers,
} from 'src/features/client-error-reporter'

const CONTEXT = {
  environment: 'test',
  platform: 'web',
  release: 'test',
  route: {origin: 'https://www.pomofi.io', template: '/'},
} satisfies ClientErrorContext

const cleanups: Array<() => void> = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
  vi.restoreAllMocks()
})

const createReporter = (send = vi.fn()) => ({
  reporter: createClientErrorReporter({
    createId: () => 'POMO-BROWSER',
    getContext: () => CONTEXT,
    now: () => 1_000,
    send,
  }),
  send,
})

const dispatchRejection = (reason: unknown) => {
  const event = new Event('unhandledrejection')
  Object.defineProperty(event, 'reason', {value: reason})
  window.dispatchEvent(event)
}

describe('installClientErrorHandlers', () => {
  it('should connect error, rejection, and reportError with object deduplication', () => {
    const previousReportError = vi.fn()
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: previousReportError,
      writable: true,
    })
    const {reporter, send} = createReporter()
    const cleanup = installClientErrorHandlers({reporter})
    cleanups.push(cleanup)
    const error = new Error('shared failure')

    globalThis.reportError(error)
    window.dispatchEvent(new ErrorEvent('error', {error, message: error.message}))
    dispatchRejection('private rejection content')

    expect(previousReportError).toHaveBeenCalledWith(error)
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[0]?.[0]).toMatchObject({source: 'report-error'})
    expect(send.mock.calls[1]?.[0]).toMatchObject({
      error: {
        message: '[Non-Error value omitted] (string)',
        name: 'NonErrorRejection',
      },
      source: 'unhandled-rejection',
    })
  })

  it('should share one listener set across remounts and remove it after the final cleanup', () => {
    const first = createReporter()
    const second = createReporter()
    const cleanupFirst = installClientErrorHandlers({reporter: first.reporter})
    const cleanupSecond = installClientErrorHandlers({reporter: second.reporter})
    cleanups.push(cleanupFirst, cleanupSecond)

    window.dispatchEvent(new ErrorEvent('error', {error: new Error('first')}))
    expect(first.send).not.toHaveBeenCalled()
    expect(second.send).toHaveBeenCalledTimes(1)

    cleanupFirst()
    window.dispatchEvent(new ErrorEvent('error', {error: new Error('second')}))
    expect(second.send).toHaveBeenCalledTimes(2)

    cleanupSecond()
    const preventDefault = (event: ErrorEvent) => event.preventDefault()
    window.addEventListener('error', preventDefault)
    window.dispatchEvent(new ErrorEvent('error', {cancelable: true, error: new Error('third')}))
    window.removeEventListener('error', preventDefault)
    expect(second.send).toHaveBeenCalledTimes(2)
  })

  it('should restore the previous active reporter when a newer registration is cleaned up', () => {
    const first = createReporter()
    const second = createReporter()
    const cleanupFirst = installClientErrorHandlers({reporter: first.reporter})
    const cleanupSecond = installClientErrorHandlers({reporter: second.reporter})
    cleanups.push(cleanupFirst, cleanupSecond)

    cleanupSecond()
    window.dispatchEvent(new ErrorEvent('error', {error: new Error('remaining registration')}))

    expect(first.send).toHaveBeenCalledTimes(1)
    expect(second.send).not.toHaveBeenCalled()
  })

  it('should restore the native reportError function and make cleanup idempotent', () => {
    const previousReportError = vi.fn()
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: previousReportError,
      writable: true,
    })
    const {reporter} = createReporter()
    const cleanup = installClientErrorHandlers({reporter})

    cleanup()
    cleanup()

    expect(globalThis.reportError).toBe(previousReportError)
  })

  it('should tolerate and restore a throwing reportError accessor', () => {
    const reportErrorDescriptor = {
      configurable: true,
      get: () => {
        throw new Error('host accessor failed')
      },
    } satisfies PropertyDescriptor
    Object.defineProperty(globalThis, 'reportError', reportErrorDescriptor)
    const installedDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'reportError')
    const {reporter, send} = createReporter()

    const cleanup = installClientErrorHandlers({reporter})
    window.dispatchEvent(new ErrorEvent('error', {error: new Error('application failed')}))
    cleanup()

    expect(send).toHaveBeenCalledTimes(1)
    expect(Object.getOwnPropertyDescriptor(globalThis, 'reportError')).toEqual(installedDescriptor)
  })

  it('should isolate a replacement reporter failure from global handlers', () => {
    const previousReportError = vi.fn()
    Object.defineProperty(globalThis, 'reportError', {
      configurable: true,
      value: previousReportError,
      writable: true,
    })
    const reporter = {
      report: () => {
        throw new Error('reporter failed')
      },
    } satisfies ClientErrorReporter
    const cleanup = installClientErrorHandlers({reporter})
    cleanups.push(cleanup)

    expect(() => globalThis.reportError(new Error('application failed'))).not.toThrow()
    expect(() =>
      window.dispatchEvent(new ErrorEvent('error', {error: new Error('render failed')})),
    ).not.toThrow()
    expect(previousReportError).toHaveBeenCalledTimes(1)
  })
})
