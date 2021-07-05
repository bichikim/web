import {Ref} from 'vue-demi'
import {MayRef, wrapRef} from '@winter-love/use'

export type AtomRecipe<T, Args extends any[]> = (...args: Args) => Promise<T> | T
export type AtomReturnType<T> = Ref<T>
export interface AtomReturnTypeWithRecipe<T, Args extends any[]> extends AtomReturnType<T>{
  act(...args: Args): unknown
}

export type AtomFunctionInitState<T> = () => T

export function atom<T>(initState: MayRef<T>): AtomReturnType<T>
export function atom<T, Args extends any[]>(
  initState: MayRef<T>, recipe?: AtomRecipe<T, Args>): AtomReturnTypeWithRecipe<T, Args>
export function atom<T, Args extends any[]>(initState: MayRef<T>, recipe?: AtomRecipe<T, Args>): any {
  const valueRef = wrapRef(initState)

  if (recipe) {
    return new Proxy(valueRef, {
      get: (target, point) => {
        if (point === 'act') {
          return (...args: Args) => {
            const result = recipe(...args)
            if (result instanceof Promise) {
              result.then((data) => {
                Reflect.set(target, 'value', data)
              })
              return
            }
            Reflect.set(target, 'value', result)
          }
        }
        return Reflect.get(valueRef, 'value')
      },
      set: (target, point, args: Args) => {
        return Reflect.set(target, point, args)
      },
    })
  }

  return valueRef
}
