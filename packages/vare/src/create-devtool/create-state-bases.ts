import {getGlobalInfo, getRelates, getState} from 'src/info'
import {StateBase} from '@vue/devtools-api'
import {isRef} from 'vue-demi'
import {isAtom} from 'src/atom'
import {findAtom} from './find-atom'

export const getValue = (value: any) => {
  if (isRef(value)) {
    return value.value
  }

  if (typeof value === 'function') {
    return 'function'
  }

  return '??'
}

export const createStateBases = (targets: Record<string, any>): Record<string, Record<string, StateBase[]>> => {
  const info = getGlobalInfo()

  if (!info) {
    return {}
  }

  return Object.keys(targets).reduce<Record<string, Record<string, StateBase[]>>>((result, key: string) => {
    const value = targets[key]
    const state = getState(info, value) ?? value
    const relates = getRelates(info, value)

    result[key] = {
      state: [
        {
          editable: true,
          key,
          objectType: 'reactive',
          value: state,
        },
      ],
    }

    if (relates) {
      result[key].relates = [...relates.entries()].map(([key, value]) => {
        const data: StateBase = {
          editable: false,
          key,
          value: getValue(value),
        }

        if (isRef(value)) {
          data.objectType = 'computed'
        }

        return data
      })
    }

    if (isAtom(value)) {
      if (!result[key].relates) {
        result[key].relates = []
      }

      const rootRelates = result[key].relates

      const atoms = findAtom(value)

      atoms.forEach(([namespace, value]) => {
        const relates = getRelates(info, value)
        if (relates) {
          [...relates.entries()].forEach(([key, value]) => {
            const data: StateBase = {
              editable: false,
              key: `${namespace}.${key}`,
              value: getValue(value),
            }
            if (isRef(value)) {
              data.objectType = 'computed'
            }
            rootRelates.push(data)
          })
        }
      })
    }

    return result
  }, {})
}
