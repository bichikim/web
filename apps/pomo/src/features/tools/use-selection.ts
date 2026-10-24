import {createMemo} from 'solid-js'
import {usePreference} from 'src/hooks/use-preference'
import {type SelectionStorage} from './selection-storage'

export interface UseSelectionOptions<T> {
  readonly initial: T
  readonly storage: SelectionStorage<T>
  readonly getDefault?: () => T
}
export const useSelection = <T>(options: UseSelectionOptions<T>) => {
  const [preference, setPreference] = usePreference({
    defaultValue: options.initial,
    key: options.storage.key,
    onError: (error) => console.warn('Failed to persist tool selection.', error),
    parse: options.storage.parse,
    storage: {
      read: () =>
        options.storage
          .read()
          .catch((error: unknown) => {
            console.warn('Failed to restore tool selection.', error)
            return null
          })
          .then((stored) => stored ?? options.getDefault?.() ?? options.initial),
      write: (_key, value) => {
        const parsed = options.storage.parse(value)
        return parsed === null ? null : options.storage.write(parsed)
      },
    },
  })
  const value = createMemo(() => preference() ?? options.initial)
  const ready = () => preference() !== null
  return {onChange: setPreference, ready, value}
}
