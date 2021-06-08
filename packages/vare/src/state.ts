import {UnwrapNestedRefs} from 'src/types'
import {AnyObject, mayFunctionValue} from '@winter-love/utils'
import {reactive} from 'vue-demi'
import {createUuid} from './utils'
import {info} from 'src/info'
import {AllKinds} from './info'

export const stateUuid = createUuid('unknown')

export type StateIdentifierName = 'state'

export type State<State> = UnwrapNestedRefs<State>

export type AnyStateGroup = State<any> | State<any>[] | Record<string, State<any>>

export const stateType: StateIdentifierName = 'state'

export const isState = (value: any): value is State<any> => {
  const valueInfo = info.get(value)

  if (!valueInfo) {
    return false
  }

  return valueInfo.identifier === stateType
}

export const relate = (state: State<any>, target: AllKinds) => {
  const stateInfo = info.get(state)
  const targetInfo = info.get(target)

  if (stateInfo && targetInfo) {
    stateInfo.relates.add(target)
    targetInfo.relates.add(state)
  }
}

export const relateState = (state: AnyStateGroup, target: AllKinds) => {
  if (isState(state)) {
    relate(state, target)
    return
  }

  /* istanbul ignore if [array type has a type error :(] */
  if (Array.isArray(state)) {
    /* istanbul ignore if [no need to test for env development] */
    if (process.env.NODE_ENV === 'development') {
      console.warn('An array relation type has a type error. Please use an object type. sorry~')
    }

    (state as State<any>[]).forEach((item) => {
      if (isState(item)) {
        relate(item, target)
      }
    })
    return
  }

  if (typeof state === 'object') {
    Object.keys(state).forEach((key) => {
      const item: State<any> = state[key]
      if (isState(item)) {
        relate(item, target)
      }
    })
  }
}

export type InitState<S> = S | (() => S)

/**
 * state is the vue reactive
 */
export const state = <S extends AnyObject>(initState: InitState<S>, name?: string): State<S> => {
  const state = reactive<S>(mayFunctionValue(initState))

  if (process.env.NODE_ENV === 'development') {
    info.set(state, {
      identifier: stateType,
      name,
      relates: new Set(),
    })
  }

  return state
}
