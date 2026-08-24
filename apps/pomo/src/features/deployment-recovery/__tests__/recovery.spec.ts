import {expect, it, vi} from 'vitest'

import {registerPreloadErrorRecovery} from '../recovery'

const createRuntime = () => {
  const listeners = new Set<(event: Event) => void>()
  let guard: string | null = null
  let currentTime = 1_000
  let scheduledClear: (() => void) | null = null
  let guardClearCancelled = false
  const cancelGuardClear = vi.fn(() => {
    guardClearCancelled = true
  })
  const reload = vi.fn()
  const runtime = {
    addPreloadErrorListener: vi.fn((listener: (event: Event) => void) => listeners.add(listener)),
    clearGuard: vi.fn(() => {
      guard = null
    }),
    now: vi.fn(() => currentTime),
    readGuard: vi.fn(() => guard),
    reload,
    removePreloadErrorListener: vi.fn((listener: (event: Event) => void) =>
      listeners.delete(listener),
    ),
    scheduleGuardClear: vi.fn((clearGuard: () => void) => {
      guardClearCancelled = false
      scheduledClear = clearGuard
      return cancelGuardClear
    }),
    writeGuard: vi.fn((expiresAt: number) => {
      guard = String(expiresAt)
    }),
  }

  return {
    advanceTime: (milliseconds: number) => {
      currentTime += milliseconds
    },
    cancelGuardClear,
    emitPreloadError: () => {
      const event = new Event('vite:preloadError', {cancelable: true})
      for (const listener of listeners) {
        listener(event)
      }
      return event
    },
    reload,
    runScheduledClear: () => {
      if (!guardClearCancelled) {
        scheduledClear?.()
      }
    },
    runtime,
  }
}

it('should reload once and suppress the recovered preload error', () => {
  const {emitPreloadError, reload, runtime} = createRuntime()
  const registration = registerPreloadErrorRecovery(runtime)

  const event = emitPreloadError()
  registration.markAppStarted()

  expect(reload).toHaveBeenCalledOnce()
  expect(runtime.writeGuard).toHaveBeenCalledOnce()
  expect(runtime.scheduleGuardClear).not.toHaveBeenCalled()
  expect(event.defaultPrevented).toBe(true)
})

it('should prevent a repeated preload error from starting a reload loop', () => {
  const {emitPreloadError, reload, runtime} = createRuntime()
  const staleRegistration = registerPreloadErrorRecovery(runtime)

  emitPreloadError()
  staleRegistration.dispose()

  registerPreloadErrorRecovery(runtime)
  const repeatedEvent = emitPreloadError()

  expect(reload).toHaveBeenCalledOnce()
  expect(repeatedEvent.defaultPrevented).toBe(false)
})

it('should ignore another preload event while the first reload is starting', () => {
  const {emitPreloadError, reload, runtime} = createRuntime()
  registerPreloadErrorRecovery(runtime)

  emitPreloadError()
  const repeatedEvent = emitPreloadError()

  expect(reload).toHaveBeenCalledOnce()
  expect(repeatedEvent.defaultPrevented).toBe(false)
})

it('should recover from a later deployment error after the restarted app is stable', () => {
  const {emitPreloadError, reload, runScheduledClear, runtime} = createRuntime()
  const staleRegistration = registerPreloadErrorRecovery(runtime)
  emitPreloadError()
  staleRegistration.dispose()

  const restartedRegistration = registerPreloadErrorRecovery(runtime)
  restartedRegistration.markAppStarted()
  runScheduledClear()
  emitPreloadError()

  expect(runtime.clearGuard).toHaveBeenCalledOnce()
  expect(reload).toHaveBeenCalledTimes(2)
})

it('should cancel pending guard cleanup when a reload starts', () => {
  const {cancelGuardClear, emitPreloadError, reload, runScheduledClear, runtime} = createRuntime()
  const staleRegistration = registerPreloadErrorRecovery(runtime)
  staleRegistration.markAppStarted()
  emitPreloadError()
  runScheduledClear()
  staleRegistration.dispose()

  registerPreloadErrorRecovery(runtime)
  emitPreloadError()

  expect(cancelGuardClear).toHaveBeenCalledOnce()
  expect(reload).toHaveBeenCalledOnce()
})

it('should keep application startup running when browser storage access fails', () => {
  const {emitPreloadError, reload, runScheduledClear, runtime} = createRuntime()
  runtime.readGuard.mockImplementation(() => {
    throw new Error('storage unavailable')
  })
  runtime.clearGuard.mockImplementation(() => {
    throw new Error('storage unavailable')
  })

  const registration = registerPreloadErrorRecovery(runtime)
  const startApp = vi.fn()

  expect(() => {
    startApp()
    registration.markAppStarted()
    runScheduledClear()
    emitPreloadError()
  }).not.toThrow()
  expect(startApp).toHaveBeenCalledOnce()
  expect(reload).not.toHaveBeenCalled()
})

it('should recover after a transient guard cleanup failure and fallback expiration', () => {
  const {advanceTime, emitPreloadError, reload, runScheduledClear, runtime} = createRuntime()
  const staleRegistration = registerPreloadErrorRecovery(runtime)
  emitPreloadError()
  staleRegistration.dispose()

  runtime.clearGuard.mockImplementationOnce(() => {
    throw new Error('storage temporarily unavailable')
  })
  const restartedRegistration = registerPreloadErrorRecovery(runtime)
  restartedRegistration.markAppStarted()
  runScheduledClear()
  advanceTime(60_001)
  emitPreloadError()

  expect(reload).toHaveBeenCalledTimes(2)
})

it('should preserve the original error when the reload guard cannot be written', () => {
  const {emitPreloadError, reload, runtime} = createRuntime()
  runtime.writeGuard.mockImplementation(() => {
    throw new Error('storage unavailable')
  })
  registerPreloadErrorRecovery(runtime)

  const event = emitPreloadError()

  expect(reload).not.toHaveBeenCalled()
  expect(event.defaultPrevented).toBe(false)
})

it('should remove the listener and cancel pending cleanup on disposal', () => {
  const {cancelGuardClear, emitPreloadError, reload, runtime} = createRuntime()
  const registration = registerPreloadErrorRecovery(runtime)
  registration.markAppStarted()
  registration.markAppStarted()
  registration.dispose()
  registration.dispose()
  registration.markAppStarted()

  emitPreloadError()

  expect(runtime.scheduleGuardClear).toHaveBeenCalledOnce()
  expect(runtime.removePreloadErrorListener).toHaveBeenCalledOnce()
  expect(cancelGuardClear).toHaveBeenCalledOnce()
  expect(reload).not.toHaveBeenCalled()
})
