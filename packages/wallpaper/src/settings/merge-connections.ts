import {DEFAULT_POFFO_SPEECH, type PoffoWidget} from './library-model'
import type {PoffoConnections} from './connections'

interface MergeConnectionsOptions {
  readonly widget: PoffoWidget
  readonly connections: PoffoConnections
  readonly mode: 'replace' | 'missing'
}

export const mergeConnections = (options: MergeConnectionsOptions): PoffoWidget => {
  const {widget, connections, mode} = options
  const speech = {...DEFAULT_POFFO_SPEECH, ...widget.speech}
  const assign = <Value>(current: Value | undefined, incoming: Value | undefined) =>
    incoming === undefined || (mode === 'missing' && current !== undefined) ? current : incoming
  return {
    ...widget,
    speech: {
      ...speech,
      agentBindings: assign(speech.agentBindings, connections.agentBindings),
      lipsync: assign(speech.lipsync, connections.lipsync),
      randomActions: assign(speech.randomActions, connections.randomActions),
      semanticBindings: assign(speech.semanticBindings, connections.semanticBindings),
    },
    tracking: assign(widget.tracking, connections.tracking),
    trackingBindings: assign(widget.trackingBindings, connections.trackingBindings),
    trackingOptions: assign(widget.trackingOptions, connections.trackingOptions),
  }
}
