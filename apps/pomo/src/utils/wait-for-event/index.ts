import {subscribeEvent} from 'src/utils/subscribe-event'

export interface EventWaitFailure {
  readonly event: string
  readonly reason: () => unknown
}

export interface WaitForEventOptions {
  readonly target: EventTarget
  readonly event: string
  readonly failure: EventWaitFailure
  readonly signal: AbortSignal
  readonly start: () => void
  /** Deadline in milliseconds, using the same failure reason as the failure event. */
  readonly timeout: number
}

interface CleanupFailure {
  readonly reason: unknown
}

/**
 * Registers before starting and settles on the first ready, failure, abort, or start exception.
 * Owns its listeners and deadline, releasing them before settlement without disposing the target.
 * An already-aborted signal rejects with its reason without subscribing or starting.
 * Attempts every listener release; the first cleanup exception takes precedence over the outcome.
 */
export const waitForEvent = (options: WaitForEventOptions): Promise<void> =>
  new Promise((resolve, reject) => {
    const {target, event, failure, signal, start, timeout: milliseconds} = options
    const {event: failureEvent, reason} = failure
    signal.throwIfAborted()
    let acquiring = true
    let completion: (() => void) | undefined
    let releaseReady: (() => void) | undefined
    let releaseFailure: (() => void) | undefined
    let releaseAbort: (() => void) | undefined
    const settle = () => {
      clearTimeout(timeout)
      let cleanupFailure: CleanupFailure | undefined
      const release = (unsubscribe: (() => void) | undefined) => {
        try {
          unsubscribe?.()
        } catch (error: unknown) {
          cleanupFailure ??= {reason: error}
        }
      }
      release(releaseReady)
      release(releaseFailure)
      release(releaseAbort)
      if (cleanupFailure !== undefined) {
        reject(cleanupFailure.reason)
        return
      }
      try {
        completion?.()
      } catch (error: unknown) {
        reject(error)
      }
    }
    const finish = (complete: () => void) => {
      if (completion !== undefined) {
        return
      }
      completion = complete
      if (!acquiring) {
        settle()
      }
    }
    const ready = () => finish(resolve)
    const fail = () => finish(() => reject(reason.call(failure)))
    const abort = () => finish(() => reject(signal.reason))
    const timeout = setTimeout(fail, milliseconds)
    try {
      // Retain cleanup ownership even when registration adds a listener and then throws.
      releaseReady = () => target.removeEventListener(event, ready, false)
      releaseReady = subscribeEvent(target, event, ready, {once: true})
      if (signal.aborted) {
        abort()
      }
      if (completion === undefined) {
        releaseFailure = () => target.removeEventListener(failureEvent, fail, false)
        releaseFailure = subscribeEvent(target, failureEvent, fail, {once: true})
        if (signal.aborted) {
          abort()
        }
      }
      if (completion === undefined) {
        releaseAbort = () => signal.removeEventListener('abort', abort, false)
        releaseAbort = subscribeEvent(signal, 'abort', abort, {once: true})
      }
    } catch (error: unknown) {
      if (signal.aborted) {
        abort()
      }
      finish(() => reject(error))
    }
    if (signal.aborted) {
      abort()
    }
    acquiring = false
    if (completion !== undefined) {
      settle()
      return
    }
    try {
      start()
    } catch (error: unknown) {
      finish(() => reject(error))
    }
  })
