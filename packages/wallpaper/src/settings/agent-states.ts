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
export const agentStateSchema = z.enum(AGENT_STATES.map((state) => state.value))
