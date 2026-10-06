import {type Accessor, createEffect, onCleanup, untrack} from 'solid-js'

export interface ScheduledCallback<Args extends unknown[]> {
  (...args: Args): unknown
  cancel(): void
  flush(): unknown
}

export interface ScheduledCallbackControls<Args extends unknown[]> {
  cancel(): void
  execute(...args: Args): void
  flush(): void
}

/** Owns reactive callback instances and retains the latest call until initialization. */
export const createScheduledCallback = <Args extends unknown[]>(
  createCallback: Accessor<ScheduledCallback<Args>>,
): ScheduledCallbackControls<Args> => {
  let currentCallback: ScheduledCallback<Args> | null = null
  let pendingArgs: Args | null = null

  createEffect(() => {
    const instance = createCallback()
    currentCallback = instance

    onCleanup(() => {
      instance.cancel()
      currentCallback = null
    })

    if (pendingArgs !== null) {
      const args = pendingArgs
      pendingArgs = null
      untrack(() => instance(...args))
    }
  })

  onCleanup(() => {
    pendingArgs = null
  })

  return {
    cancel: () => {
      pendingArgs = null
      currentCallback?.cancel()
    },
    execute: (...args: Args) => {
      if (currentCallback === null) {
        pendingArgs = args
        return
      }
      currentCallback(...args)
    },
    flush: () => {
      currentCallback?.flush()
    },
  }
}
