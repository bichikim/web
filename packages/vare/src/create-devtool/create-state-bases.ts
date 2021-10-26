
import {StateBase} from '@vue/devtools-api'
import {isRef} from 'vue-demi'
import {isAtom} from 'src/atom'
import {findAtom} from './find-atom'
import {useInfo} from 'src/info'

export const getValue = (value: any) => {
  if (isRef(value)) {
    return value.value
  }

  if (typeof value === 'function') {
    return 'function'
  }

  return '??'
}

export type StateBases = Record<string, {
  base: Record<string, StateBase[]>
  refresh: () => Record<string, StateBase[]>
}>

export const createStateBases = (targets?: Record<string, any>): StateBases => {
  if (!targets) {
    return {}
  }

  const info = useInfo()

  return Object.keys(targets).reduce<StateBases>((result, key: string) => {
    const value = targets[key]
    const targetInfo = info.get(value)
    const state = value
    const relates = targetInfo?.relates

    const stateInfo: Record<string, StateBase[]> = {
      state: [
        {
          editable: true,
          key,
          objectType: 'reactive',
          value: state,
        },
      ],
    }

    result[key] = {
      base: stateInfo,
      refresh: () => {
        const updateInfo: Record<string, StateBase[]> = {}

        if (relates) {
          updateInfo.relates = [...relates.entries()].map(([key, value]) => {
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
          if (!updateInfo.relates) {
            updateInfo.relates = []
          }

          const rootRelates = updateInfo.relates

          const atoms = findAtom(value)

          atoms.forEach(([namespace, value]) => {
            const relates = info.get(value)?.relates
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
        return {
          ...stateInfo,
          ...updateInfo,
        }
      },
    }
    return result
  }, {})
}
