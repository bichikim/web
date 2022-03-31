/* eslint-disable functional/no-expression-statement,functional/immutable-data,functional/functional-parameters,functional/prefer-readonly-type,functional/no-conditional-statement */
import {App, CustomInspectorNode, setupDevtoolsPlugin, StateBase} from '@vue/devtools-api'
import {drop, parseJson, toArray} from '@winter-love/utils'
import {UnwrapNestedRefs, watch} from 'vue-demi'
import {STORE_TREE_KEY} from './symbols'

const tagThemes = {
  'local-state': {
    backgroundColor: 0x73_AB_FE,
    label: 'local state',
    textColor: 0x00_00_00,
  },
  state: {
    backgroundColor: 0x06_05_FC,
    label: 'state',
    textColor: 0x00_00_00,
  },
  unknown: {
    backgroundColor: 0xFF_B7_00,
    label: 'unknown',
    textColor: 0x00_00_00,
  },
}

export const createTree = (stateTree: UnwrapNestedRefs<any>, index: number = 0): CustomInspectorNode[] => {
  const info = stateTree[STORE_TREE_KEY]

  return Object.keys(stateTree).map((key): CustomInspectorNode => {
    const itemInfo = parseJson(key, key)
    const tag = typeof itemInfo === 'string' ? [] : [
      {
        backgroundColor: 0x99_99_99,
        label: `for: ${itemInfo.componentName}`,
        textColor: 0x00_00_00,
      },
      {
        backgroundColor: 0x99_99_99,
        label: itemInfo.uid,
        textColor: 0x00_00_00,
      },
    ]
    return {
      id: JSON.stringify({
        index: index,
        key,
      }),
      label: typeof itemInfo === 'string' ? itemInfo : itemInfo.name,
      tags: [
        {
          ...tagThemes[info?.kind ?? 'unknown'],
        },
        ...tag,
      ],
    }
  })
}

export const createTreeMultiple = (...stateTrees: UnwrapNestedRefs<any>[]) => {
  return stateTrees.flatMap((stateTree, index) => {
    return createTree(stateTree, index)
  })
}

export const createInspect = (name, state: UnwrapNestedRefs<any>): Record<string, StateBase[]> => {
  const itemInfo = parseJson(name, name)
  return {
    state: [
      {
        editable: true,
        key: typeof itemInfo === 'string' ? itemInfo : itemInfo.name,
        objectType: 'reactive',
        value: state,
      },
    ],
  }
}

export const createStoreDevTool = (
  app: App,
  stateTree: UnwrapNestedRefs<any> | UnwrapNestedRefs<any>[],
) => {
  // let _api: DevtoolsPluginApi<ApiSetting>
  const inspectId = 'vare-inspect'
  const timeLineId = 'vare-event'
  const label = 'vare-store'
  const stateTrees = toArray(stateTree)
  setupDevtoolsPlugin({
    app,
    id: 'vare-store',
    label: 'vare-store',
    packageName: 'vare',
  }, (api) => {
    // _api = api
    api.addInspector({
      icon: 'mediation',
      id: inspectId,
      label: `${label} Structure`,
    })

    api.addTimelineLayer({
      color: 0xF0_8D_49,
      id: timeLineId,
      label: 'Vare Changing',
    })

    api.on.getInspectorTree((payload) => {
      if (payload.app !== app || payload.inspectorId !== inspectId) {
        return
      }

      payload.rootNodes = createTreeMultiple(...stateTrees)
    })

    api.on.getInspectorState((payload) => {
      if (payload.app !== app || payload.inspectorId !== inspectId) {
        return
      }

      const name = payload.nodeId
      const {key, index} = parseJson(name, {index: 0, key: name})

      const state = stateTrees[index][key]

      if (state) {
        payload.state = createInspect(key, state)
      }
    })
    api.on.editInspectorState((payload) => {
      if (payload.app !== app || payload.inspectorId !== inspectId) {
        return
      }

      const name = payload.nodeId
      const {key, index} = parseJson(name, {index: 0, key: name})

      const state = stateTrees[index][key]

      if (state) {
        const path = drop(1)(payload.path)
        const {value} = payload.state
        payload.set(state, path, value)
      }
    })

    Object.keys(stateTree).forEach((name: string) => {
      watch(stateTree[name], () => {
        api.addTimelineEvent({
          event: {
            data: typeof stateTree[name] === 'object' ? {...stateTree[name]} : stateTree[name],
            time: Date.now(),
          },
          layerId: timeLineId,
        })
      })
    })
  })
}
