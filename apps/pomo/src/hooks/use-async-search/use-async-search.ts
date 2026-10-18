import {useDebounce} from '@winter-love/solid-use/debounce'
import {
  type Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  untrack,
} from 'solid-js'
import {useAsyncTask} from 'src/features/async-task'

const DEFAULT_DELAY_MILLISECONDS = 300

interface SearchInput {
  readonly query: string
}

export type AsyncSearchStatus = 'error' | 'idle' | 'input-required' | 'ready' | 'searching'

export interface UseAsyncSearchProps<Item> {
  /** Debounce delay in milliseconds. Defaults to 300. */
  readonly delayMs?: number
  /** Minimum trimmed query length. Defaults to 1. */
  readonly minLength?: number
  readonly query: Accessor<string>
  readonly search: (query: string, signal: AbortSignal) => Promise<ReadonlyArray<Item>>
}

export interface AsyncSearchController<Item> {
  /** Cancels work and clears results until the query changes again. */
  readonly reset: () => void
  readonly results: Accessor<ReadonlyArray<Item>>
  readonly status: Accessor<AsyncSearchStatus>
}

/** Debounces trimmed queries, cancels superseded work, and exposes the latest search outcome. */
export const useAsyncSearch = <Item>(
  props: UseAsyncSearchProps<Item>,
): AsyncSearchController<Item> => {
  const input = createMemo<SearchInput>(() => ({query: props.query()}))
  const task = useAsyncTask({task: props.search})
  const [inputStatus, setInputStatus] = createSignal<'idle' | 'input-required' | 'searching'>(
    'idle',
  )
  let searchRequest: AbortController | null = null
  let dismissedInput: SearchInput | null = null

  const executeSearch = (query: string) => {
    const controller = new AbortController()
    searchRequest = controller
    task
      .execute(query, controller.signal)
      // Failure is exposed by the task state consumed below.
      .catch(() => undefined)
      .finally(() => {
        if (searchRequest === controller) {
          searchRequest = null
        }
      })
  }
  const debounce = useDebounce(executeSearch, props.delayMs ?? DEFAULT_DELAY_MILLISECONDS)

  const cancelSearch = () => {
    batch(() => {
      debounce.cancel()
      task.reset()
      searchRequest?.abort()
      searchRequest = null
      setInputStatus('idle')
    })
  }

  const reset = () => {
    dismissedInput = untrack(input)
    cancelSearch()
  }

  createEffect(
    on(input, (currentInput) => {
      onCleanup(cancelSearch)
      if (currentInput === dismissedInput) {
        return
      }

      const normalizedQuery = currentInput.query.trim()
      if (normalizedQuery.length === 0) {
        return
      }
      if (normalizedQuery.length < (props.minLength ?? 1)) {
        setInputStatus('input-required')
        return
      }

      setInputStatus('searching')
      debounce.execute(normalizedQuery)
    }),
  )

  const results = createMemo<ReadonlyArray<Item>>(() => {
    const state = task.state()
    return state.status === 'success' ? state.result : []
  })
  const status = createMemo<AsyncSearchStatus>(() => {
    const state = task.state()
    switch (state.status) {
      case 'idle':
        return inputStatus()
      case 'pending':
        return 'searching'
      case 'success':
        return 'ready'
      case 'error':
        return 'error'
      default: {
        const exhaustive: never = state
        return exhaustive
      }
    }
  })

  return {reset, results, status}
}
