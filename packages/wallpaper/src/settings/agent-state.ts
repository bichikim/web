import {z} from 'zod'
import {SEMANTIC_ACTION_LIMIT, type SemanticAction, semanticActionSchema} from './semantics'
import type {AgentState} from './agent-states'
export {AGENT_STATES, type AgentState} from './agent-states'

export interface AgentStateBinding {
  /** Character behaviors held together while this state has priority; omission uses the legacy parameter. */
  readonly actions?: readonly SemanticAction[]
  readonly parameterId: string | null
  readonly on?: number
  readonly off?: number
}
export type AgentStateBindings = Partial<Record<AgentState, AgentStateBinding>>
export type AgentSignals = Partial<Record<AgentState, boolean>>
const binding = z
  .object({
    actions: z.array(semanticActionSchema).max(SEMANTIC_ACTION_LIMIT).optional(),
    off: z.number().finite().optional(),
    on: z.number().finite().optional(),
    parameterId: z.string().min(1).nullable(),
  })
  .optional()
export const agentStateBindingsSchema = z.object({
  approval: binding,
  connected: binding,
  error: binding,
  interrupted: binding,
  question: binding,
  response: binding,
  tool: binding,
  working: binding,
})
