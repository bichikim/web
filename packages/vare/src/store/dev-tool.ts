/* eslint-disable functional/no-expression-statement,functional/immutable-data,functional/functional-parameters,functional/prefer-readonly-type,functional/no-conditional-statement */
import {App, CustomInspectorNode, setupDevtoolsPlugin, StateBase} from '@vue/devtools-api'
import {drop, parseJson, toArray} from '@winter-love/utils'
import {UnwrapNestedRefs, watch} from 'vue-demi'
import {ManagerData} from './manager'

const tagThemes = {
  'local-state': {
    backgroundColor: 0x73_ab_fe,
    label: 'local state',
    textColor: 0x00_00_00,
  },
  state: {
    backgroundColor: 0x06_05_fc,
    label: 'state',
    textColor: 0x00_00_00,
  },
  unknown: {
    backgroundColor: 0xff_b7_00,
    label: 'unknown',
    textColor: 0x00_00_00,
  },
}

export const createTree = (store: ManagerData, index: number = 0): CustomInspectorNode[] => {
  const {info, tree} = store

  return Object.keys(tree).map((key): CustomInspectorNode => {
    const itemInfo = parseJson(key, key)
    const tag =
      typeof itemInfo === 'string'
        ? []
        : [
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

export const createTreeMultiple = (...stores: ManagerData[]) => {
  return stores.flatMap((store, index) => {
    return createTree(store, index)
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

export const createStoreDevTool = (app: App, stores: ManagerData | ManagerData[]) => {
  // let _api: DevtoolsPluginApi<ApiSetting>
  const inspectId = 'vare-inspect'
  const timeLineId = 'vare-event'
  const label = 'vare-store'
  const _stores = toArray(stores)
  setupDevtoolsPlugin(
    {
      app,
      id: 'vare-store',
      label: 'vare-store',
      packageName: 'vare',
    },
    (api) => {
      // _api = api
      api.addInspector({
        icon: 'mediation',
        id: inspectId,
        label: `${label} Structure`,
      })

      api.addTimelineLayer({
        color: 0xf0_8d_49,
        id: timeLineId,
        label: 'Vare Changing',
      })

      api.on.getInspectorTree((payload) => {
        if (payload.app !== app || payload.inspectorId !== inspectId) {
          return
        }

        payload.rootNodes = createTreeMultiple(..._stores)
      })

      api.on.getInspectorState((payload) => {
        if (payload.app !== app || payload.inspectorId !== inspectId) {
          return
        }

        const name = payload.nodeId
        const {key, index} = parseJson(name, {index: 0, key: name})

        const state = _stores[index].tree[key]

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

        const state = _stores[index].tree[key]

        if (state) {
          const path = drop(payload.path, 1)
          const {value} = payload.state
          payload.set(state, path, value)
        }
      })

      Object.keys(_stores).forEach((name: string) => {
        const store = _stores[name]
        watch(store.tree, () => {
          api.addTimelineEvent({
            event: {
              data: typeof store.tree === 'object' ? {...store.tree} : store.tree,
              time: Date.now(),
            },
            layerId: timeLineId,
          })
        })
      })
    },
  )
}
