import {State} from 'src/state'
import {StateBase} from '@vue/devtools-api'
import {isAtom} from 'src/atom'

export type StateBases = Record<string, StateBase>

export const createGetStates = (states: Record<string, State<any>>) => {
  let cache: StateBases

  return () => {
    if (cache) {
      return cache
    }

    cache = Object.keys(states).reduce<StateBases>((result, key: string) => {
      const value = states[key]
      result[key] = {
        editable: true,
        key,
        objectType: 'reactive',
        value: isAtom(value) ? value.value : value,
      }
      return result
    }, {})

    return cache
  }
}
