import {NotFunction} from 'src/types'

export type UnsubscribeFunc<Value> = () => Value | undefined
export type SubscribeCallback<Value> = (value: Value) => unknown
export type SubscribeFunc<Value> = (callback: SubscribeCallback<Value>) => UnsubscribeFunc<Value>

export interface Subscribe<Value> {
  subscribe: SubscribeFunc<Value>
  update: (value: ((value: Value | undefined) => Value) | Value) => void
}

export const createSubscribe = <Value extends NotFunction>(initValue: () => Value): Subscribe<Value> => {
  let _value: Value
  const _poll = new Set<(value: Value) => void>()

  const listener = (value: Value) => {
    _value = value

    for (const callback of _poll) {
      callback(value)
    }
  }

  const subscribe = (callback: SubscribeCallback<Value>): UnsubscribeFunc<Value> => {
    _poll.add(callback)

    return () => {
      //
      _poll.delete(callback)

      if (_value === undefined) {
        _value = initValue()
      }

      return _value
    }
  }

  const update = (value: ((value: Value | undefined) => Value) | Value) => {
    _value = typeof value === 'function' ? value(_value) : value
    listener(_value)
  }

  return {
    subscribe,
    update,
  }
}

export const getSubscribeValue = <Value>(target: Subscribe<Value>) => target.subscribe(() => null)()
