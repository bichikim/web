import {MayRef, wrapRef} from '@winter-love/use'
import {Ref, shallowRef} from 'vue-demi'
import {devtools} from './devtool'
import {info} from './info'
import {watchAction} from './subscribe'

export type AtomRecipe<T, Args extends any[] = any[]> = (...args: Args) => Promise<T> | T
export type AtomReturnType<T> = Ref<T>
export type CheckPromise<T extends Promise<unknown> | unknown> = T extends Promise<any> ? Promise<boolean> : boolean

export interface AtomReturnTypeWithRecipe<T, Args extends any[], Return, Error = any> extends AtomReturnType<T>{
  act(...args: Args): CheckPromise<Return>
  error?: Error
}

export type AtomFunctionInitState<T> = () => T

export type Atom<T> = AtomReturnType<T> | AtomReturnTypeWithRecipe<T, any[], any>

export type AtomIdentifierName = 'atom'

export const atomName: AtomIdentifierName = 'atom'

export const isAtom = (value: any): value is Atom<any> => {
  const valueInfo = info.get(value)

  if (!valueInfo) {
    return false
  }

  return valueInfo.identifier === atomName
}

export function atom<T>(initState: MayRef<T>): AtomReturnType<T>
export function atom<T, Recipe extends AtomRecipe<T>, Error = any>(
  initState: MayRef<T>, recipe?: Recipe): AtomReturnTypeWithRecipe<T, Parameters<Recipe>, ReturnType<Recipe>, Error>
export function atom<T, Args extends any[]>(initState: MayRef<T>, recipe?: AtomRecipe<T, Args>, name?: string): any {
  const valueRef = wrapRef(initState)
  const error = shallowRef<any>()
  const watchFlag = shallowRef<any[]>()
  let atom

  if (recipe) {
    atom = new Proxy(valueRef, {
      get: (target, point, receiver) => {
        if (point === 'act') {
          return (...args: Args) => {
            error.value = undefined
            if (process.env.Node_ENV === 'development') {
              watchFlag.value = args
            }
            try {
              const result = recipe(...args)
              if (result instanceof Promise) {
                return result.then((data) => {
                  Reflect.set(target, 'value', data, receiver)
                  return true
                }).catch((_error) => {
                  error.value = _error
                  return false
                })
              }
              Reflect.set(target, 'value', result, receiver)
            } catch (_error) {
              error.value = _error
              return false
            }
          }
        }

        if (point === 'error') {
          return Reflect.get(valueRef, 'value', error)
        }

        return Reflect.get(valueRef, 'value', valueRef)
      },
      set: (target, point, args: Args, receiver) => {
        return Reflect.set(target, point, args, receiver)
      },
    })
  } else {
    atom = valueRef
  }

  if (process.env.NODE_ENV === 'development') {
    info.set(atom, {
      identifier: atomName,
      name,
      watchFlag,
    })

    watchAction(atom, () => {
      devtools?.updateTimeline('atomAction', {
        title: name,
      })
    })
  }

  return atom
}
