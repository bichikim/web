export interface AgentExitPayload {
  readonly code: number | null
  readonly signal: string | null
}

export type ParseAgentExitEventDataResult =
  | {readonly kind: 'ok'; readonly payload: AgentExitPayload}
  | {readonly kind: 'parse-error'}

export const parseAgentExitEventData = (data: string): ParseAgentExitEventDataResult => {
  try {
    const parsed = JSON.parse(data) as {code?: unknown; signal?: unknown}
    const code = typeof parsed.code === 'number' ? parsed.code : null
    const signal =
      parsed.signal === null ? null : typeof parsed.signal === 'string' ? parsed.signal : null

    return {kind: 'ok', payload: {code, signal}}
  } catch {
    return {kind: 'parse-error'}
  }
}
