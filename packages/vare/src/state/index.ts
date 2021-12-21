import {AnyObject, mayFunctionValue} from '@winter-love/utils'
import {useInfo} from 'src/info'
import {UnwrapNestedRefs} from 'src/types'
import {reactive} from 'vue-demi'
import {StateSymbol} from './symbol'

export const stateName: StateIdentifierName = 'state'

export type StateIdentifierName = 'state'

export type State<State> = UnwrapNestedRefs<State> & {
  [StateSymbol]: boolean
}

export type AnyState = State<any> | State<any>[] | Record<string, State<any>>

export const isState = (value: any): value is State<any> => {
  return Boolean(value?.[StateSymbol])
}

export type InitState<S> = S | (() => S)

/**
 * state is the vue reactive
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
