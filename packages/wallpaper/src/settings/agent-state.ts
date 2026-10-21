import {z} from 'zod'

export const AGENT_STATES = [
  {label: '연결됨', value: 'connected'},
  {label: '작업 중', value: 'working'},
  {label: '도구 처리 중', value: 'tool'},
  {label: '질문', value: 'question'},
  {label: '승인 대기', value: 'approval'},
  {label: '응답 도착', value: 'response'},
  {label: '중단', value: 'interrupted'},
  {label: '도구 오류', value: 'error'},
] as const
export type AgentState = (typeof AGENT_STATES)[number]['value']
export interface AgentStateBinding {
  readonly parameterId: string | null
  readonly on?: number
  readonly off?: number
}
export type AgentStateBindings = Partial<Record<AgentState, AgentStateBinding>>
export type AgentSignals = Partial<Record<AgentState, boolean>>
const binding = z
  .object({
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
