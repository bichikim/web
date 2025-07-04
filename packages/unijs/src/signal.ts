import {effectScope as _effectScope, signal as _signal} from 'alien-signals'
import {effectWithTeardown} from './effect-with-teardown'

export {teardown, compare} from './effect-with-teardown'
export * from 'alien-signals'

interface EffectInfo {
  prevTeardown: (() => void) | null
}

let __effectInfo: EffectInfo = {
  prevTeardown: null,
}

export function effect<T>(recipe: () => T): [T, stop: () => void] {
  let result: any

  const effectInfo = {
    prevTeardown: null,
  }

  __effectInfo = effectInfo

  const stop = effectWithTeardown(() => {
    result = recipe()
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

export interface Signal<T> {
  (): T
  (value: T): void
  [SIGNAL_SYMBOL]?: true
}

export const isSignal = (value: any): value is Signal<any> => {
  return value && value[SIGNAL_SYMBOL] === true
}
