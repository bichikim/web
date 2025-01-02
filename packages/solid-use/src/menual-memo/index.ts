import {} from '@winter-love/utils'
import {Accessor, createMemo, createSignal, createUniqueId} from 'solid-js'

export const manualMemo = <R>(effectFunction: () => R): [Accessor<R>, () => void] => {
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

export const createManualMemo = manualMemo
