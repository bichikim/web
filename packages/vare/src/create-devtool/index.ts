import {DevtoolsPluginApi, setupDevtoolsPlugin, TimelineEvent} from '@vue/devtools-api'
import {drop, isSSR} from '@winter-love/utils'
import {watchTrigger} from 'src/create-devtool/watch-trigger'
import {createStateBases} from './create-state-bases'
import {ApiSetting, CreateDevToolOptions} from './types'
import {watchState} from './watch-state'
import {atomName} from 'src/atom'
import {createInspectorTree} from './create-inspector-tree'
import {Info} from 'src/info'
import {mutationName} from 'src/mutate'

export const DEVTOOL_ID = 'com.npmjs.packages.vare'

/**
 * @deprecated
 * @param app
 * @param targets
 * @param options
 */
// eslint-disable-next-line max-lines-per-function
export const createDevTool = (
  // fix type error
  app: any,
  targets: Record<string, any> = {},
  options: CreateDevToolOptions = {},
) => {
  if (isSSR()) {
    return
  }
  const stateBases = createStateBases(targets)

  const {
    id: inspectorId = 'vare-structure',
    label = 'Vare',
    timeLines = {
      [atomName]: {
        color: 0xF0_8D_49,
        label: 'Vare Atom Actions',
      },
      [mutationName]: {
        color: 0xF0_8D_49,
        label: 'Vare Mutate',
      },
    },
  } = options

  let _api: DevtoolsPluginApi<ApiSetting>

  const updateState = () => {
    _api?.sendInspectorState(inspectorId)
  }

  setupDevtoolsPlugin({
    app,
    id: DEVTOOL_ID,
    label,
    packageName: 'vare',
  }, (api) => {
    _api = api

    api.addInspector({
      icon: 'mediation',
      id: inspectorId,
      label: `${label} Structure`,
      stateFilterPlaceholder: 'Search for state',
      treeFilterPlaceholder: `Search for ${label}`,
    })

    Object.keys(timeLines).forEach((id: string) => {
      const info = timeLines[id]
      api.addTimelineLayer({
        color: info.color,
        id,
        label: info.label,
      })
    })

    api.on.getInspectorTree((payload) => {
      if (payload.app !== app || payload.inspectorId !== inspectorId) {
        return
      }

      const {nodes} = createInspectorTree(targets)
      payload.rootNodes = nodes
    })

    api.on.getInspectorState((payload) => {
      if (payload.app !== app || payload.inspectorId !== inspectorId) {
        return
      }

      const state = stateBases[payload.nodeId]

      if (state) {

        payload.state = state.refresh(updateState)
      }
    })

    api.on.editInspectorState((payload) => {
      if (payload.app !== app || payload.inspectorId !== inspectorId) {
        return
      }

      const state = stateBases[payload.nodeId]

      if (state) {
        const path = drop(1)(payload.path)
        const _state = state.base
        const {value} = payload.state
        payload.set(_state.value, path, value)
      }
    })
  })

  const updateTimeline = (layerId: string, event: Omit<TimelineEvent, 'time'>, all?: boolean) => {
    _api?.addTimelineEvent({
      all,
      event: {
        ...event,
        time: Date.now(),
      },
      layerId,
    })
  }

  const updateTrigger = (args: any[], info?: Info) => {
    if (!info || !info.kind) {
      return
    }

    updateTimeline(info.kind, {
      data: {
        args,
        type: info.kind,
      },
    })
  }

  const updateTree = () => {
    _api?.sendInspectorTree(inspectorId)
  }

  watchState(targets, updateState)
  watchTrigger(targets, updateTrigger)

  return {
    updateState,
    updateTimeline,
    updateTree,
  }
}
