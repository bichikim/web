import {type Accessor, createSignal, onCleanup} from 'solid-js'

export type AsyncTaskConcurrency = 'exhaust' | 'latest'

export type AsyncTaskState<Result> =
  | {readonly status: 'idle'}
  | {readonly status: 'pending'}
  | {readonly result: Result; readonly status: 'success'}
  | {readonly error: unknown; readonly status: 'error'}

export interface UseAsyncTaskProps<Arguments extends readonly unknown[], Result> {
  /** Controls overlapping executions. Defaults to `latest`. */
  readonly concurrency?: AsyncTaskConcurrency
  readonly task: (...arguments_: Arguments) => Promise<Result>
}

export interface AsyncTaskController<Arguments extends readonly unknown[], Result> {
  readonly execute: (...arguments_: Arguments) => Promise<Result>
  readonly reset: () => void
  readonly state: Accessor<AsyncTaskState<Result>>
}

/** Manages observable state and concurrency for an imperative asynchronous task. */
export const useAsyncTask = <Arguments extends readonly unknown[], Result>(
  props: UseAsyncTaskProps<Arguments, Result>,
): AsyncTaskController<Arguments, Result> => {
  const [state, setState] = createSignal<AsyncTaskState<Result>>({status: 'idle'})
  let activePromise: Promise<Result> | null = null
  let executionId = 0

  const invokeTask = (arguments_: Arguments) => {
    try {
      return props.task(...arguments_)
    } catch (error: unknown) {
      return Promise.reject<Result>(error)
    }
  }

  const execute = (...arguments_: Arguments) => {
    if (props.concurrency === 'exhaust' && activePromise !== null) {
      return activePromise
    }

    executionId += 1
    const currentId = executionId
    setState({status: 'pending'})
    const nextPromise = invokeTask(arguments_)
      .then((result) => {
        if (currentId === executionId) {
          setState({result, status: 'success'})
        }

        return result
      })
      .catch((error: unknown) => {
        if (currentId === executionId) {
          setState({error, status: 'error'})
        }

        throw error
      })
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
    setState({status: 'idle'})
  }

  onCleanup(() => {
    executionId += 1
    activePromise = null
  })

  return {execute, reset, state}
}
