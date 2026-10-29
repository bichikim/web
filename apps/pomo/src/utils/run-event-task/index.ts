import {subscribeEvent} from 'src/utils/subscribe-event'

export interface RunEventTaskOptions<Value> {
  /** Target that emits readiness and failure; ownership remains with the caller. */
  readonly target: EventTarget
  /** Event that completes the task successfully. */
  readonly readyEvent: string
  /** Event that completes the task through onFailure. */
  readonly failureEvent: string
  /** Cancellation source; pre-aborted signals skip subscription and start. */
  readonly signal: AbortSignal
  /** Deadline in milliseconds; expiry invokes onFailure. */
  readonly timeoutMs: number
  /** Starts work synchronously after subscription; thrown values reject unchanged. */
  readonly start: () => void
  /** Produces the result synchronously after all listeners and the deadline are released. */
  readonly onReady: () => Value
  /** Produces the cancellation result or throws its reason after cleanup. */
  readonly onAbort: () => Value
  /** Releases caller resources as needed and throws the failure after cleanup. */
  readonly onFailure: () => never
}

/** Starts an event-driven task, settles once, and releases its listeners and deadline before callbacks. */
export const runEventTask = <Value>(options: RunEventTaskOptions<Value>): Promise<Value> =>
  new Promise((resolve, reject) => {
    const {signal} = options
    if (signal.aborted) {
      resolve(options.onAbort())
      return
    }

    let settled = false
    const finish = (complete: () => Value) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timeout)
      releaseReady()
      releaseFailure()
      releaseAbort()
      try {
        resolve(complete())
      } catch (error: unknown) {
        reject(error)
      }
    }
    const ready = () => finish(options.onReady)
    const fail = () => finish(options.onFailure)
    const abort = () => finish(options.onAbort)
    const releaseReady = subscribeEvent(options.target, options.readyEvent, ready, {once: true})
    const releaseFailure = subscribeEvent(options.target, options.failureEvent, fail, {once: true})
    const releaseAbort = subscribeEvent(signal, 'abort', abort, {once: true})
    const timeout = setTimeout(fail, options.timeoutMs)
    try {
      options.start()
    } catch (error: unknown) {
      finish(() => {
        throw error
      })
    }
  })
