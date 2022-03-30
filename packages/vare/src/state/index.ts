/* eslint-disable functional/prefer-readonly-type */
import {AnyObject, mayFunctionValue} from '@winter-love/utils'
import {useInfo} from 'src/info'
import {UnwrapNestedRefs} from 'src/types'
import {reactive} from 'vue-demi'
import {StateSymbol} from './symbol'
/**
 * @deprecated
 */
export const stateName: StateIdentifierName = 'state'
/**
 * @deprecated
 */
export type StateIdentifierName = 'state'
/**
 * @deprecated
 */
export type State<State> = UnwrapNestedRefs<State> & {
  [StateSymbol]: boolean
}
/**
 * @deprecated
 */
export type AnyState = State<any> | State<any>[] | Record<string, State<any>>
/**
 * @deprecated
 */
export const isState = (value: any): value is State<any> => {
  return Boolean(value?.[StateSymbol])
}
/**
 * @deprecated
 */
export type InitState<S> = S | (() => S)

/**
 * state is the vue reactive
 * @deprecated
 */
export const state = <S extends AnyObject>(initState: InitState<S>, name?: string): State<S> => {
  const state: State<S> = reactive<S>(mayFunctionValue(initState)) as any

  if (process.env.NODE_ENV === 'development') {
    const info = useInfo()
    info.set(state, {
      kind: stateName,
      name,
    })
  }

  state[StateSymbol] = true

  return state
}
