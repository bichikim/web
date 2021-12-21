import {StateBase} from '@vue/devtools-api'

import {isAction, isAtomComputedRef} from 'src/atom'
import {isCompute, isComputedRef} from 'src/compute'
import {findState} from 'src/create-devtool/find-state'
import {useInfo} from 'src/info'
import {isMutate} from 'src/mutate'
import {isRef} from 'vue-demi'
import {stringToArgs} from './string-to-args'

export const getValue = (value: any) => {
  if (isRef(value)) {
    return value.value
  }

  return '??'
}

export type StateBases = Record<string, {
  base: Record<string, StateBase[]>
  refresh: (updateState: () => any) => Record<string, StateBase[]>
}>

const MAX_LENGTH = 30

const argsToString = (args: any[] = []) => {
  return args.map((value) => {
    if (typeof value === 'string') {
      return `"${value}"`
    }
    return String(value)
  }).join(', ')
}

// eslint-disable-next-line max-statements
const getRelatesState = (key, value, updateState?: () => any) => {
  const data: StateBase = {
    editable: false,
    key,
    value: '??',
  }

  if (isComputedRef(value) || isAtomComputedRef(value)) {
    data.objectType = 'computed'
    data.value = getValue(value)
    return data
  }

  if (isRef(value)) {
    data.value = getValue(value)
    return data
  }

  if (isCompute(value)) {
    const info = useInfo().get(value)
    const args = info?.args ?? []
    let _value

    try {
      _value = value(...args)
    } catch {
      return data
    }
    data.value = {
      _custom: {
        actions: [
          {
            action() {
              // eslint-disable-next-line
              const data = prompt(`Edit ${key}`, argsToString(info?.args))
              if (data && info) {
                info.args = stringToArgs(data)
              }
              updateState?.()
            },
            icon: 'create',
            tooltip: 'edit arguments',
          },
        ],
        display: `${getValue(_value)} (${args.join(', ')}) => ...(computed)`,
        fields: {
          abstract: true,
        },
        readOnly: false,
        type: 'computed',
      },
    }
    return data
  }

  if (isMutate(value) || isAction(value)) {
    const info = useInfo().get(value)
    data.value = {
      _custom: {
        display: info?.raw ?? `${value.toString().slice(0, MAX_LENGTH)}...`,
        type: 'function',
      },
    }
    return data
  }

  return data
}

export const createStateBases = (targets?: Record<string, any>): StateBases => {
  if (!targets) {
    return {}
  }

  const info = useInfo()

  return Object.fromEntries(Object.entries(targets).map(([key, value]) => {
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

    return [key, {
      base: stateInfo,
      refresh: (updateState?: () => any) => {
        const updateInfo: Record<string, StateBase[]> = {}

        if (relates) {
          updateInfo.relates = [...relates.entries()].map(([key, value]) => getRelatesState(key, value, updateState))
        }
        if (!updateInfo.relates) {
          updateInfo.relates = []
        }

        const rootRelates = updateInfo.relates

        const atoms = findState(value)

        atoms.forEach(([_, value]) => {
          const relates = info.get(value)?.relates
          if (relates) {
            rootRelates.push(...[...relates.entries()].map(([key, value]) => getRelatesState(key, value, updateState)))
          }
        })
        return {
          ...stateInfo,
          ...updateInfo,
        }
      },
    }]
  }))
}
