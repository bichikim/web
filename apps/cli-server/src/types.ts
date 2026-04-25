/** `content` 배열 원소 — 현재 샘플에서는 `text` 블록만 확인됨. */
export interface AgentStreamTextContent {
  readonly type: 'text'
  readonly text: string
}

/** `user` / `assistant` 메시지 본문. */
export interface AgentStreamMessage {
  readonly role: 'user' | 'assistant'
  readonly content: readonly AgentStreamTextContent[]
}

/** 세션 시작 등 시스템 메타(예: `subtype: "init"`). */
export interface AgentStreamSystemInitEvent {
  readonly type: 'system'
  readonly subtype: 'init'
  readonly apiKeySource: string
  readonly cwd: string
  readonly session_id: string
  readonly model: string
  readonly permissionMode: string
}

export interface AgentStreamUserEvent {
  readonly type: 'user'
  readonly message: AgentStreamMessage
  readonly session_id: string
}

/** 스트리밍 청크는 `timestamp_ms`가 붙을 수 있고, 마지막 합쳐진 메시지는 생략될 수 있음. */
export interface AgentStreamAssistantEvent {
  readonly type: 'assistant'
  readonly message: AgentStreamMessage
  readonly session_id: string
  readonly timestamp_ms?: number
}

export interface AgentStreamTokenUsage {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly cacheReadTokens: number
  readonly cacheWriteTokens: number
}

/** 스트림 종료 요약(`subtype` 예: `"success"`). */
export interface AgentStreamResultEvent {
  readonly type: 'result'
  readonly subtype: string
  readonly duration_ms: number
  readonly duration_api_ms: number
  readonly is_error: boolean
  readonly result: string
  readonly session_id: string
  readonly request_id: string
  readonly usage: AgentStreamTokenUsage
}

/** CLI `--output-format stream-json` 한 줄(객체 하나)에 대응하는 이벤트 합집합. */
export type AgentStreamEvent =
  | AgentStreamSystemInitEvent
  | AgentStreamUserEvent
  | AgentStreamAssistantEvent
  | AgentStreamResultEvent
