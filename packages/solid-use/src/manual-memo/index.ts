import {Accessor, createMemo, createSignal, createUniqueId} from 'solid-js'

/**
 * create a manual memo hook
 * can update value manually
 */
export const createManualMemo = <R>(effectFunction: () => R): [Accessor<R>, () => void] => {
  const [signal, setSignal] = createSignal(createUniqueId())

  const value = createMemo(() => {
    signal()

    return effectFunction()
  })

  const forceUpdate = () => {
    setSignal(() => createUniqueId())
  }

  return [value, forceUpdate]
}
