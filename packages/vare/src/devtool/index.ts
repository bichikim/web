import {State} from 'src/state'
import {subscribe} from 'src/subscribe'
import {drop, isSSR} from '@winter-love/utils'
import {
  AllKinds, getIdentifier, getName, setName, setPlayground,
} from 'src/info'
import {
  DevtoolsPluginApi, setupDevtoolsPlugin, StateBase, TimelineEvent,
} from '@vue/devtools-api'
import {App} from 'vue-demi'
import {Atom} from 'src/atom'
import {genInspectorTree} from './gen-inspector-tree'
import {genNoneStateInfo} from './gen-none-state-info'
import {createGetStates} from './get-states'

export type GetStates = () => Record<string, Omit<StateBase, 'key'>>

export const DEVTOOL_ID = 'com.npmjs.packages.vare'

export const getNamedStates = (states: Record<string, State<any>>): Record<string, State<any>> => {
  return Object.keys(states).reduce((result, key) => {
    const state = states[key]
    let name = getName(state)

    if (!name) {
      name = key
      setName(state, key)
    }

    result[name] = state
    return result
  }, {})
}

export type EventKind = 'action' | 'mutation' | 'atomAction'

// eslint-disable-next-line max-lines-per-function
export const getDevtool = (app: App, states: Record<string, State<any>>) => {
  if (isSSR()) {
    return
  }

  let _api: DevtoolsPluginApi
  const inspectorId = 'vare-structure'
  const timelineIds: Record<EventKind, string> = {
    action: 'vare-action',
    atomAction: 'vare-atom-action',
    mutation: 'vare-mutation',
  }
  let relationMap: Map<string, AllKinds> = new Map<string, AllKinds>()
  const _states = getNamedStates(states)
  const getStates = createGetStates(_states)

  setupDevtoolsPlugin({
    app,
    id: DEVTOOL_ID,
    label: 'Vare',
    packageName: 'vare',
    // eslint-disable-next-line max-lines-per-function
  }, (api) => {
    _api = api

    api.addInspector({
      icon: 'mediation',
      id: inspectorId,
      label: 'Vare Structure',
      stateFilterPlaceholder: 'Search for state',
      treeFilterPlaceholder: 'Search for Vare',
    })

    api.addTimelineLayer({
      color: 0xF08D49,
      id: timelineIds.action,
      label: 'Vare Actions',
    })

    api.addTimelineLayer({
      color: 0x3EAF7C,
      id: timelineIds.mutation,
      label: 'Vare Mutation',
    })

    api.on.getInspectorTree((payload) => {
      if (payload.app !== app || payload.inspectorId !== inspectorId) {
        return
      }

      const {nodes, relationMap: _relationMap} = genInspectorTree(_states)
      relationMap = _relationMap

      payload.rootNodes = nodes
    })

    api.on.getInspectorState((payload) => {
      if (payload.app !== app || payload.inspectorId !== inspectorId) {
        return
      }

      const states = getStates()

      const state = states[payload.nodeId]

      // if user select the state
      if (state) {
        payload.state = {
          state: [state],
        }
        return
      }

      // if user select the mutation, computation or action
      const member = relationMap.get(payload.nodeId)

      payload.state = genNoneStateInfo(member)
    })

    api.on.editInspectorState((payload) => {
      if (payload.app !== app || payload.inspectorId !== inspectorId) {
        return
      }

      const state = states[payload.nodeId]

      if (state) {
        const path = drop(payload.path)
        const {value} = payload.state

        payload.set(state, path, value)

        return
      }

      const member = relationMap.get(payload.nodeId)

      const type = getIdentifier(member)

      if (type === 'computation' && payload.path.includes('args')) {
        setPlayground(member, {
          args: payload.state.value,
          // return: member(payload.state.value).value,
        })
      }
    })
  })

  const updateTimeline = (kind: EventKind, event: Omit<TimelineEvent, 'time' | 'data'>, all?: boolean) => {
    const layerId = timelineIds[kind]

    _api?.addTimelineEvent({
      all,
      event: {
        ...event,
        data: {
          type: kind,
        },
        time: Date.now(),
      },
      layerId,
    })
  }

  const updateTree = () => {
    _api?.sendInspectorTree(inspectorId)
  }

  const updateState = () => {
    _api?.sendInspectorState(inspectorId)
  }

  return {
    updateState,
    updateTimeline,
    updateTree,
  }
}

export let devtools: undefined | ReturnType<typeof getDevtool>

export const startDevtool = (app: App, states: Record<string, State<any> | Atom<any>>) => {
  const tools = getDevtool(app, states)

  if (tools) {
    devtools = tools
    const {updateState} = tools

    // updating state
    for (const key of Object.keys(states)) {
      const state = states[key]

      subscribe(state, () => updateState())
    }

    tools.updateTree()
  }

  return tools
}
