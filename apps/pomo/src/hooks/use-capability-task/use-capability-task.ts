import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'
import {type AsyncTaskState, useAsyncTask, type UseAsyncTaskProps} from 'src/features/async-task'

export type CapabilityAvailability = 'checking' | 'supported' | 'unsupported'

export interface UseCapabilityTaskProps<
  Arguments extends readonly unknown[],
  Result,
> extends UseAsyncTaskProps<Arguments, Result> {
  readonly capability: () => boolean
}

export interface CapabilityTaskController<Arguments extends readonly unknown[], Result> {
  readonly reset: () => void
  readonly availability: Accessor<CapabilityAvailability>
  readonly state: Accessor<AsyncTaskState<Result>>
  readonly execute: (...arguments_: Arguments) => Promise<Result | undefined>
}

/**
 * Probes capability after mount and invokes supported tasks immediately with useAsyncTask semantics.
 * Support does not imply permission. Unavailable or disposed executions resolve undefined without
 * changing task state. Disposal suppresses task state updates but does not cancel task side effects.
 */
export const useCapabilityTask = <Arguments extends readonly unknown[], Result>(
  props: UseCapabilityTaskProps<Arguments, Result>,
): CapabilityTaskController<Arguments, Result> => {
  const [availability, setAvailability] = createSignal<CapabilityAvailability>('checking')
  const task = useAsyncTask(props)
  let disposed = false

  onCleanup(() => {
    disposed = true
  })
  onMount(() => {
    if (!disposed) {
      setAvailability(props.capability() ? 'supported' : 'unsupported')
    }
  })

  const execute = (...arguments_: Arguments): Promise<Result | undefined> => {
    if (disposed || availability() !== 'supported') {
      return Promise.resolve(undefined)
    }
    return task.execute(...arguments_)
  }

  return {availability, execute, reset: task.reset, state: task.state}
}
