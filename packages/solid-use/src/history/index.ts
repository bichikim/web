import {createMemo, createSignal} from 'solid-js'

export const useHistory = <T>(initHistory: T[] = []) => {
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
