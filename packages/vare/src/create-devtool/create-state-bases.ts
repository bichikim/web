import {getGlobalInfo, getState} from 'src/info'
import {StateBase} from '@vue/devtools-api'

export const createStateBases = (targets: Record<string, any>): Record<string, StateBase> => {
  const info = getGlobalInfo()

  if (!info) {
    return {}
  }

  return Object.keys(targets).reduce<Record<string, StateBase>>((result, key: string) => {
    const value = targets[key]
    const state = getState(info, value) ?? value

    result[key] = {
      editable: true,
      key,
      objectType: 'reactive',
      value: state,
    }
    return result
  }, {})
}
