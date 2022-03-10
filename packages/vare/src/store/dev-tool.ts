import {App, CustomInspectorNode, DevtoolsPluginApi, setupDevtoolsPlugin, StateBase} from '@vue/devtools-api'
import {drop} from '@winter-love/utils'
import {ApiSetting} from 'src/create-devtool/types'
import {UnwrapNestedRefs} from 'vue'

export const createTree = (stateTree: UnwrapNestedRefs<any>): CustomInspectorNode[] => {
  return Object.keys(stateTree).map((key): CustomInspectorNode => {
    return {
      id: key,
      label: key,
      tags: [{
        backgroundColor: 0x73_AB_FE,
        label: 'state',
        textColor: 0x00_00_00,
      }],
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
  let _api: DevtoolsPluginApi<ApiSetting>
  const inspectId = 'vare-inspect'
  const label = 'vare-store'
  setupDevtoolsPlugin({
    app,
    id: 'vare-store',
    label: 'vare-store',
    packageName: 'vare',
  }, (api) => {
    _api = api
    api.addInspector({
      icon: 'mediation',
      id: inspectId,
      label: `${label} Structure`,
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
  })
}
