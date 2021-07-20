import {UnwrapNestedRefs} from '@winter-love/use'
import {DropParameters} from '@winter-love/utils'
import {reactive, shallowRef} from 'vue-demi'
import {devtools} from './devtool'
import {info} from './info'
import {watchAction} from './subscribe'

export type AtomRecipe<T extends UnwrapNestedRefs<any>, Args extends any[] = any[]> =
  (state: T, ...args: Args) => unknown

export interface AtomType<T> {
  readonly value: UnwrapNestedRefs<T>
}

export type CheckPromise<T extends Promise<unknown> | unknown> = T extends Promise<any> ? Promise<boolean> : boolean

export interface AtomTypeWithRecipe<T, Args extends any[], Error = any> extends AtomType<T> {
  act: (...args: Args) => unknown
  readonly error?: Error
}

export type AtomFunctionInitState<T> = () => T

export type Atom<T> = AtomType<T> | AtomTypeWithRecipe<T, any[], any>

export type AtomIdentifierName = 'atom'

export const atomName: AtomIdentifierName = 'atom'

export const isAtom = (value: any): value is Atom<any> => {
  const valueInfo = info.get(value)

  if (!valueInfo) {
    return false
  }

  return valueInfo.identifier === atomName
}

export type MayAtomType<T extends Record<string, any>> =
  T | UnwrapNestedRefs<T> | AtomType<T> | AtomTypeWithRecipe<T, any[]>

export const wrapAtom = <T extends Record<string, any>>(value: MayAtomType<T>): UnwrapNestedRefs<T> => {
  return reactive(value.value ?? value)
}

export function atom<T extends Record<string, any>>(initState: MayAtomType<T>): AtomType<T>
export function atom<T extends Record<string, any>, Recipe extends AtomRecipe<UnwrapNestedRefs<T>>, Error = any>(
  initState: MayAtomType<T>,
  recipe?: Recipe,
): AtomTypeWithRecipe<T, DropParameters<Recipe>, Error>
export function atom<T extends Record<string, any>, Args extends any[]>(
  initState: MayAtomType<T>,
  recipe?: AtomRecipe<UnwrapNestedRefs<T>, Args>,
  name?: string,
): any {
  const valueReactive = wrapAtom(initState)
  const errorRef = shallowRef<any>()
  const watchFlag = shallowRef<any[]>()
  let atom

  if (recipe) {
    atom = new Proxy({}, {
      get: (target, point) => {
        switch (point) {
          case 'act':
            return (...args: Args) => {
              errorRef.value = undefined
              if (process.env.NODE_ENV === 'development') {
                watchFlag.value = args
              }
              try {
                const result = recipe(valueReactive, ...args)
                if (result instanceof Promise) {
                  return result.catch((_error) => {
                    errorRef.value = _error
                    return false
                  })
                }
              } catch (_error) {
                errorRef.value = _error
                return false
              }
            }
          case 'error':
            return Reflect.get(errorRef, 'value', errorRef)
          case 'value':
            return valueReactive
        }
      },
    })
  } else {
    atom = new Proxy({}, {
      get: (target, point) => {
        if (point === 'value') {
          return valueReactive
        }
      },
    })
  }

  info.set(atom, {
    identifier: atomName,
    name,
    watchFlag,
  })

  if (process.env.NODE_ENV === 'development') {
    watchAction(atom, () => {
      devtools?.updateTimeline('atomAction', {
        title: name,
      })
    })
  }

  return atom
}
