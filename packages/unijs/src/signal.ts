import {computed as _computed, effectScope as _effectScope, signal as _signal} from 'alien-signals'
import {effectWithTeardown} from './effect-with-teardown'

export {teardown} from './effect-with-teardown'
export {untrack} from './untrack'
export * from 'alien-signals'

interface EffectInfo {
  prevTeardown: (() => void) | null
}

let __effectInfo: EffectInfo = {
  prevTeardown: null,
}

export function effect<T>(recipe: (prevValue?: T) => T): [T, stop: () => void] {
  let result: any

  const effectInfo = {
    prevTeardown: null,
  }

  __effectInfo = effectInfo

  const stop = effectWithTeardown((prevValue) => {
    result = recipe(prevValue as T)

    return result
  })

  __effectInfo = {
    prevTeardown: null,
  }

  return [result, stop]
}

export const effectScope = <T>(recipe: () => T): [T, stop: () => void] => {
  let result: any

  const scope = _effectScope(() => {
    result = recipe()
  })

  return [result, scope]
}

const SIGNAL_SYMBOL = Symbol('signal')

export const signal: typeof _signal = (initialValue?: any): any => {
  const signal = _signal(initialValue)

  signal[SIGNAL_SYMBOL] = true

  return signal
}

export const computed = <T>(getter: (previousValue?: T) => T): (() => T) => {
  const computed = _computed(getter)

  computed[SIGNAL_SYMBOL] = true

  return computed
}

export interface Signal<T> {
  (): T
  (value: T): void
  [SIGNAL_SYMBOL]?: true
}

export const isSignal = (value: any): value is Signal<any> => {
  return value && value[SIGNAL_SYMBOL] === true
}
