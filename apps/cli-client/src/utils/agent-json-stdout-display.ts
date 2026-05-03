import {normalizeNewlines} from '@/utils/normalize-newlines'

export interface AgentJsonStdoutReducerState {
  readonly lineBuffer: string
  readonly accumulatedAssistant: string
  readonly display: string
}

export const createInitialAgentJsonStdoutReducerState = (): AgentJsonStdoutReducerState => ({
  accumulatedAssistant: '',
  display: '',
  lineBuffer: '',
})

type StreamJsonRecord = {
  readonly type: string
  readonly message?: unknown
  readonly result?: unknown
}

const parseStreamJsonRecord = (trimmed: string): StreamJsonRecord | null => {
  if (trimmed === '') {
    return null
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(trimmed) as unknown
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null
  }

  const record = parsed as {type?: unknown; message?: unknown; result?: unknown}

  if (typeof record.type !== 'string') {
    return null
  }

  return record as StreamJsonRecord
}

const extractAssistantTextDelta = (message: unknown): string | null => {
  if (typeof message !== 'object' || message === null || !('content' in message)) {
    return null
  }

  const {content} = message as {content: unknown}

  if (!Array.isArray(content)) {
    return null
  }

  let delta = ''

  for (const item of content) {
    if (typeof item === 'object' && item !== null) {
      const block = item as {type?: unknown; text?: unknown}

      if (block.type === 'text' && typeof block.text === 'string') {
        delta += block.text
      }
    }
  }

  return delta === '' ? null : delta
}

const mergeAssistantAccumulated = (accumulatedAssistant: string, delta: string): string => {
  return accumulatedAssistant.length > 0 && delta.startsWith(accumulatedAssistant)
    ? delta
    : accumulatedAssistant + delta
}

const applyStreamJsonLine = (
  accumulatedAssistant: string,
  display: string,
  line: string,
): {accumulatedAssistant: string; display: string} => {
  const record = parseStreamJsonRecord(line.trim())

  if (record === null) {
    return {accumulatedAssistant, display}
  }

  if (record.type === 'assistant') {
    const delta = extractAssistantTextDelta(record.message)

    if (delta === null) {
      return {accumulatedAssistant, display}
    }

    // 스트림이 토큰 델타를 이어 보내다가, 마지막에 전체 문장을 다시 담은 assistant 이벤트를 보내는 경우가 있음.
    // 이 경우 `accumulated + delta`로 붙이면 문장이 두 번 나온다 → delta가 누적 접두사로 시작하면 스냅샷으로 치환.
    const nextAccumulated = mergeAssistantAccumulated(accumulatedAssistant, delta)

    return {accumulatedAssistant: nextAccumulated, display: nextAccumulated}
  }

  if (record.type === 'result' && typeof record.result === 'string') {
    return {accumulatedAssistant: '', display: record.result}
  }

  return {accumulatedAssistant, display}
}

/**
 * 스트림 종료 시 `lineBuffer`에 남은 NDJSON(마지막 개행 없음 등)을 처리합니다.
 * `feed`와 동일한 줄 단위 로직을 쓰므로, 여러 줄이 남아 있어도 `JSON.parse(전체 버퍼)`로 실패해
 * `result` 줄이 버려지는 일이 없습니다.
 */
export const flushAgentJsonStdoutBuffer = (
  state: AgentJsonStdoutReducerState,
): AgentJsonStdoutReducerState => feedAgentJsonStdoutChunk(state, '\n')

export const feedAgentJsonStdoutChunk = (
  state: AgentJsonStdoutReducerState,
  chunk: string,
): AgentJsonStdoutReducerState => {
  let lineBuffer = state.lineBuffer + normalizeNewlines(chunk)
  let {accumulatedAssistant} = state
  let {display} = state

  const lines = lineBuffer.split('\n')
  lineBuffer = lines.pop() ?? ''

  for (const line of lines) {
    ;({accumulatedAssistant, display} = applyStreamJsonLine(accumulatedAssistant, display, line))
  }

  return {
    accumulatedAssistant,
    display,
    lineBuffer,
  }
}
