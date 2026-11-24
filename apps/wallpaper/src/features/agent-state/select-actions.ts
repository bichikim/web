import type {
  AgentSignals,
  AgentState,
  AgentStateBindings,
} from '@winter-love/wallpaper/settings/agent-state'
import type {CharacterAction, SemanticSelection} from '../semantics/types'

interface SelectAgentActionsOptions {
  /** State-to-behavior connections for this widget. */
  readonly bindings: AgentStateBindings
  /** Active flags aggregated across connected chats. */
  readonly signals: AgentSignals
  /** Behaviors available on the loaded character; missing targets are ignored. */
  readonly actions: readonly CharacterAction[]
}
const PRIORITY: readonly AgentState[] = [
  'error',
  'approval',
  'question',
  'tool',
  'working',
  'response',
  'interrupted',
  'connected',
]

/** Selects one active state's complete bundle so simultaneous chats cannot mix incompatible poses. */
export const selectAgentActions = (
  options: SelectAgentActionsOptions,
): readonly SemanticSelection[] =>
  PRIORITY.map((state) => {
    if (options.signals[state] !== true) {
      return []
    }
    const targets = options.bindings[state]?.actions ?? []
    const selections = targets.flatMap((target) => {
      const action = options.actions.find(
        (item) => item.action.kind === target.kind && item.action.id === target.id,
      )
      return action === undefined ? [] : [{action, group: 'agent-state'}]
    })
    return selections.length === targets.length ? selections : []
  }).find((selections) => selections.length > 0) ?? []
