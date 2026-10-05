import {type Accessor, createMemo, createSignal} from 'solid-js'

export type HistoryReturn<T> = [
  currentValue: Accessor<T | undefined>,
  addValue: (newValue: T) => void,
  history: Accessor<T[]>,
]

export const useHistory = <T>(initHistory: T[] = []): HistoryReturn<T> => {
  const [history, setHistory] = createSignal<T[]>(initHistory)

  const currentValue = createMemo(() => {
    const _history = history()

    return _history.at(-1)
  })

  return [
    currentValue,
    (newValue: T) => {
      setHistory((value) => [...value, newValue])
    },
    history,
  ]
}
