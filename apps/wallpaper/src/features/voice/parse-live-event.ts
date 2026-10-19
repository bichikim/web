interface ReadyEvent {
  readonly type: 'ready'
}
interface FailedEvent {
  readonly type: 'failed'
}
interface EndedEvent {
  readonly type: 'ended'
  readonly endMilliseconds: number
}
interface IgnoredEvent {
  readonly type: 'ignored'
}
export type LiveEvent = ReadyEvent | FailedEvent | EndedEvent | IgnoredEvent

/** Reads lifecycle events without retaining speech transcripts or other session data. */
export const parseLiveEvent = (text: string): LiveEvent => {
  let event: unknown
  try {
    event = JSON.parse(text)
  } catch {
    return {type: 'ignored'}
  }
  if (event === null || typeof event !== 'object' || !('type' in event)) {
    return {type: 'ignored'}
  }
  switch (event.type) {
    case 'session.started':
      return {type: 'ready'}
    case 'error':
      return {type: 'failed'}
    case 'turn.done': {
      const turn = 'turn' in event ? event.turn : null
      if (
        turn === null ||
        typeof turn !== 'object' ||
        !('role' in turn) ||
        turn.role !== 'assistant'
      ) {
        return {type: 'ignored'}
      }
      const end = 'end_ms' in turn ? turn.end_ms : 0
      return {
        endMilliseconds: typeof end === 'number' && Number.isFinite(end) && end >= 0 ? end : 0,
        type: 'ended',
      }
    }
    default:
      return {type: 'ignored'}
  }
}
