/* eslint-disable functional/no-expression-statement,functional/immutable-data,functional/functional-parameters,functional/prefer-readonly-type,functional/no-conditional-statement */
import {App, CustomInspectorNode, setupDevtoolsPlugin, StateBase} from '@vue/devtools-api'
import {drop} from '@winter-love/utils'
import {UnwrapNestedRefs, watch} from 'vue-demi'

export const createTree = (stateTree: UnwrapNestedRefs<any>): CustomInspectorNode[] => {
  return Object.keys(stateTree).map((key): CustomInspectorNode => {
    return {
      id: key,
      label: key,
      tags: [
        {
          backgroundColor: 0x73_AB_FE,
          label: 'state',
          textColor: 0x00_00_00,
        },
      ],
    }
  })
}

export const createInspect = (name, state: UnwrapNestedRefs<any>): Record<string, StateBase[]> => {
  return {
    state: [
      {
        editable: true,
        key: name,
        objectType: 'reactive',
        value: state,
      },
    ],
  }
}

export const createStoreDevTool = (
  app: App,
  stateTree: UnwrapNestedRefs<any>,
) => {
  // let _api: DevtoolsPluginApi<ApiSetting>
  const inspectId = 'vare-inspect'
  const timeLineId = 'vare-event'
  const label = 'vare-store'
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

      payload.rootNodes = createTree(stateTree)
    })

    api.on.getInspectorState((payload) => {
      if (payload.app !== app || payload.inspectorId !== inspectId) {
        return
      }

      const name = payload.nodeId

      const state = stateTree[name]

      if (state) {
        payload.state = createInspect(name, state)
      }
    })
    api.on.editInspectorState((payload) => {
      if (payload.app !== app || payload.inspectorId !== inspectId) {
        return
      }

      const name = payload.nodeId

      const state = stateTree[name]

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
