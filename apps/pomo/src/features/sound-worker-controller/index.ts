import {createSoundWorker} from '../sound-generation/create-sound-worker'
import {createSignal, onCleanup} from 'solid-js'
import {replaceBlobObjectUrl} from '../blob-object-url'
import {getExceptionMessage} from '../error-detail'
import type {LoopRequest, SoundMessage, SoundRequest, SoundWorker} from '../sound-generation/types'

export interface SoundWorkerCompletion {
  readonly blob: Blob
  readonly status: string
}
export interface SoundWorkerJobContext {
  readonly clearResult: () => void
  readonly reportStatus: (status: string) => void
}
export interface SoundWorkerPlan {
  readonly request: SoundRequest | LoopRequest
  readonly complete: (
    blob: Blob,
    context: SoundWorkerJobContext,
  ) => SoundWorkerCompletion | Promise<SoundWorkerCompletion>
}
export interface SoundWorkerControllerOptions {
  readonly createWorker?: () => SoundWorker
  readonly initialStatus: string
  readonly busyError: string
  readonly busyStatus: string
  readonly stoppedStatus: string
  readonly failureStatus: string
  readonly responseFailureStatus?: string
  readonly workerFailureMessage: string
}
export interface SoundWorkerRunOptions {
  readonly initialStatus: string
  readonly validate?: () => {readonly error: string; readonly status: string} | null
  readonly plan: SoundWorkerPlan | ((context: SoundWorkerJobContext) => Promise<SoundWorkerPlan>)
}
interface SoundWorkerResponses {
  readonly isActive: () => boolean
  readonly onProgress: (message: string) => void
  readonly onResult: (blob: Blob) => void
  readonly onFailure: (error: Error, responseError: boolean) => void
  readonly failureMessage: string
}
const attachSoundWorkerResponses = (worker: SoundWorker, options: SoundWorkerResponses) => {
  worker.onmessage = (event: MessageEvent<SoundMessage>) => {
    if (!options.isActive()) {
      return
    }
    const message = event.data
    switch (message.type) {
      case 'progress':
        options.onProgress(message.message)
        return
      case 'error':
        options.onFailure(new Error(message.message), true)
        return
      case 'result':
        options.onResult(message.blob)
        return
    }
    message satisfies never
  }
  worker.onerror = (event) => {
    if (options.isActive()) {
      options.onFailure(new Error(event.message || options.failureMessage), false)
    }
  }
}
/** Owns UI state, a single active sound Worker and its result URL. */
export const createSoundWorkerController = (options: SoundWorkerControllerOptions) => {
  const [busy, setBusy] = createSignal(false)
  const [status, setStatus] = createSignal(options.initialStatus)
  const [error, setError] = createSignal<string | null>(null)
  const [url, setUrl] = createSignal<string | null>(null)
  let revision = 0
  let worker: SoundWorker | null = null
  let settleActive: (() => void) | null = null
  const terminate = () => {
    worker?.terminate()
    worker = null
  }
  const clearResult = () => setUrl(replaceBlobObjectUrl(url(), () => null))
  const stop = () => {
    revision += 1
    terminate()
    settleActive?.()
    settleActive = null
    setBusy(false)
    if (error() === options.busyError) {
      setError(null)
    }
    setStatus(options.stoppedStatus)
  }
  onCleanup(() => {
    stop()
    clearResult()
  })
  const run = (input: SoundWorkerRunOptions): Promise<void> => {
    if (busy()) {
      setError(options.busyError)
      setStatus(options.busyStatus)
      return Promise.resolve()
    }
    const invalid = input.validate?.()
    if (invalid !== undefined && invalid !== null) {
      setError(invalid.error)
      setStatus(invalid.status)
      return Promise.resolve()
    }
    revision += 1
    const current = revision
    setBusy(true)
    setError(null)
    setStatus(input.initialStatus)
    return new Promise((resolve) => {
      settleActive = resolve
      const isCurrent = () => current === revision
      const context: SoundWorkerJobContext = {
        clearResult: () => {
          if (isCurrent()) {
            clearResult()
          }
        },
        reportStatus: (next) => {
          if (isCurrent()) {
            setStatus(next)
          }
        },
      }
      const finish = () => {
        if (!isCurrent()) {
          return
        }
        terminate()
        setBusy(false)
        settleActive = null
        resolve()
      }
      const fail = (cause: unknown, nextStatus = options.failureStatus) => {
        if (!isCurrent()) {
          return
        }
        setError(getExceptionMessage(cause, () => String(cause)))
        setStatus(nextStatus)
        finish()
      }
      const complete = (result: SoundWorkerCompletion) => {
        if (!isCurrent()) {
          return
        }
        setError(null)
        setUrl(replaceBlobObjectUrl(url(), () => result.blob))
        setStatus(result.status)
        finish()
      }
      const execute = (plan: SoundWorkerPlan) => {
        if (!isCurrent()) {
          return
        }
        try {
          const execution = (options.createWorker ?? createSoundWorker)()
          worker = execution
          attachSoundWorkerResponses(execution, {
            failureMessage: options.workerFailureMessage,
            isActive: () => isCurrent() && worker === execution,
            onFailure: (cause, responseError) =>
              fail(
                cause,
                responseError
                  ? (options.responseFailureStatus ?? options.failureStatus)
                  : options.failureStatus,
              ),
            onProgress: setStatus,
            onResult: (blob) => {
              terminate()
              try {
                const result = plan.complete(blob, context)
                if (result instanceof Promise) {
                  result.then(complete, fail)
                } else {
                  complete(result)
                }
              } catch (cause: unknown) {
                fail(cause)
              }
            },
          })
          execution.postMessage(plan.request)
        } catch (cause: unknown) {
          fail(cause)
        }
      }
      if (typeof input.plan === 'function') {
        try {
          input.plan(context).then(execute, fail)
        } catch (cause: unknown) {
          fail(cause)
        }
      } else {
        clearResult()
        execute(input.plan)
      }
    })
  }
  return {busy, error, run, status, stop, url}
}
