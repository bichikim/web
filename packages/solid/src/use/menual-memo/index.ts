import {createUuid} from '@winter-love/utils'
import {Accessor, createMemo, createSignal} from 'solid-js'

export const manualMemo = <R>(effectFunction: () => R): [Accessor<R>, () => void] => {
  const uuid = createUuid()
  const [signal, setSignal] = createSignal(uuid())

  const value = createMemo(() => {
    signal()
    return effectFunction()
  })

  const forceUpdate = () => {
    setSignal(() => uuid())
  }

  return [value, forceUpdate]
}

export const createManualMemo = manualMemo
