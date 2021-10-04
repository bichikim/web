import {DevtoolsPluginApi, setupDevtoolsPlugin, TimelineEvent} from '@vue/devtools-api'
import {isSSR} from '@winter-love/utils'
import {watchTrigger} from 'src/create-devtool/watch-trigger'
import {VareInfo} from 'src/info'
import {App} from 'vue-demi'
import {createStateBases} from './create-state-bases'
import {ApiSetting, CreateDevToolOptions} from './types'
import {watchState} from './watch-state'
import {atomName} from 'src/atom'

export const DEVTOOL_ID = 'com.npmjs.packages.vare'

export const createDevTool = (
  app: App,
  targets: Record<string, any>,
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
        color: 0xF08D49,
        label: 'Vare Atom Actions',
      },
    },
  } = options

  let _api: DevtoolsPluginApi<ApiSetting>

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

    api.on.getInspectorState((payload) => {
      if (payload.app !== app || payload.inspectorId !== inspectorId) {
        return
      }
      const state = stateBases[payload.nodeId]

      if (state) {

        payload.state = {
          state: [state],
        }
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

  const updateTrigger = (info?: VareInfo<string>) => {
    if (!info) {
      return
    }

    updateTimeline(info.identifier, {
      data: {
        type: info.identifier,
      },
    })
  }

  const updateTree = () => {
    _api?.sendInspectorTree(inspectorId)
  }

  const updateState = () => {
    _api?.sendInspectorState(inspectorId)
  }

  watchState(targets, updateState)
  watchTrigger(targets, updateTrigger)

  return {
    updateState,
    updateTimeline,
    updateTree,
  }
}
