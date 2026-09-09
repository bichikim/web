import {createSignal, onCleanup, onMount, untrack} from 'solid-js'
import {type SelectionStorage} from './selection-storage'

export interface UseSelectionOptions<T> {
  readonly initial: T
  readonly storage: SelectionStorage<T>
  readonly getDefault?: () => T
}
export const useSelection = <T>(options: UseSelectionOptions<T>) => {
  const [value, setValue] = createSignal(untrack(() => options.initial))
  const [ready, setReady] = createSignal(false)
  let disposed = false
  onCleanup(() => {
    disposed = true
  })
  onMount(() => {
    const fallback = options.getDefault?.() ?? options.initial
    options.storage
      .read()
      .then((stored) => {
        if (!disposed) {
          setValue(() => stored ?? fallback)
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setValue(() => fallback)
        }
        console.warn('Failed to restore tool selection.', error)
      })
      .finally(() => {
        if (!disposed) {
          setReady(true)
        }
      })
  })
  const onChange = (next: T) => {
    if (!ready()) {
      return
    }
    setValue(() => next)
    options.storage.write(next).catch((error: unknown) => {
      console.warn('Failed to save tool selection.', error)
    })
  }
  return {ready, onChange, value}
}
