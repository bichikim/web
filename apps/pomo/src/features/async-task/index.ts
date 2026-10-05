import {type Accessor, createSignal, onCleanup, untrack} from 'solid-js'

export type AsyncTaskConcurrency = 'exhaust' | 'latest'

export type AsyncTaskState<Result> =
  | {readonly status: 'idle'}
  | {readonly status: 'pending'}
  | {readonly result: Result; readonly status: 'success'}
  | {readonly error: unknown; readonly status: 'error'}

export interface UseAsyncTaskProps<Arguments extends readonly unknown[], Result> {
  /** Controls overlapping executions. Defaults to `latest`. */
  readonly concurrency?: AsyncTaskConcurrency
  /** Owns successful results; must not throw. Released on replacement, reset, disposal, or stale completion. */
  readonly cleanupResult?: (result: Result) => void
  readonly task: (...arguments_: Arguments) => Promise<Result>
}

export interface AsyncTaskController<Arguments extends readonly unknown[], Result> {
  readonly execute: (...arguments_: Arguments) => Promise<Result>
  readonly reset: () => void
  readonly state: Accessor<AsyncTaskState<Result>>
}

/**
 * Manages imperative execution, state, and concurrency without observing inputs.
 * Reset/disposal invalidate completion; they do not abort the underlying operation.
 * With cleanupResult, returned results are borrowed until replacement/reset/disposal;
 * obsolete resolved results are released before their execution promise resolves.
 * Execution after disposal rejects without invoking the task.
 */
export const useAsyncTask = <Arguments extends readonly unknown[], Result>(
  props: UseAsyncTaskProps<Arguments, Result>,
): AsyncTaskController<Arguments, Result> => {
  const [state, setState] = createSignal<AsyncTaskState<Result>>({status: 'idle'})
  let activePromise: Promise<Result> | null = null
  let executionId = 0
  let disposed = false

  const releaseResult = () => {
    const current = untrack(state)
    if (current.status === 'success' && props.cleanupResult !== undefined) {
      setState({status: 'idle'})
      untrack(() => props.cleanupResult?.(current.result))
    }
  }

  const invokeTask = (arguments_: Arguments, currentId: number) => {
    try {
      return untrack(() => props.task(...arguments_))
    } catch (error: unknown) {
      if (currentId === executionId) {
        setState({error, status: 'error'})
      }
      return Promise.reject<Result>(error)
    }
  }

  const execute = (...arguments_: Arguments) => {
    if (disposed) {
      return Promise.reject<Result>(new Error('Async task is disposed'))
    }

    if (props.concurrency === 'exhaust' && activePromise !== null) {
      return activePromise
    }

    executionId += 1
    const currentId = executionId
    releaseResult()
    setState({status: 'pending'})
    const nextPromise = invokeTask(arguments_, currentId)
      .then(
        (result) => {
          if (currentId === executionId) {
            setState({result, status: 'success'})
          } else {
            untrack(() => props.cleanupResult?.(result))
          }

          return result
        },
        (error: unknown) => {
          if (currentId === executionId) {
            setState({error, status: 'error'})
          }

          throw error
        },
      )
      .finally(() => {
        if (activePromise === nextPromise) {
          activePromise = null
        }
      })
    activePromise = nextPromise

    return nextPromise
  }

  const reset = () => {
    executionId += 1
    activePromise = null
    releaseResult()
    setState({status: 'idle'})
  }

  onCleanup(() => {
    disposed = true
    releaseResult()
    executionId += 1
    activePromise = null
  })

  return {execute, reset, state}
}
