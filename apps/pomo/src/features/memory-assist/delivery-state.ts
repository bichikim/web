export interface IdleDeliveryState {
  readonly status: 'idle'
}

export interface PendingDeliveryState {
  readonly memoId: string
  readonly status: 'pending'
}

export interface RemovedDeliveryState {
  readonly memoId: string
  readonly status: 'removed'
}

export type DeliveryState = IdleDeliveryState | PendingDeliveryState | RemovedDeliveryState

interface StartDeliveryEvent {
  readonly memoId: string
  readonly type: 'start'
}

interface MemoRemovedEvent {
  readonly type: 'memo-removed'
}

interface FinishDeliveryEvent {
  readonly type: 'finish'
}

type DeliveryEvent = StartDeliveryEvent | MemoRemovedEvent | FinishDeliveryEvent

export const transitionDeliveryState = (
  currentState: DeliveryState,
  event: DeliveryEvent,
): DeliveryState => {
  switch (event.type) {
    case 'start':
      return {memoId: event.memoId, status: 'pending'}
    case 'memo-removed':
      return currentState.status === 'pending'
        ? {memoId: currentState.memoId, status: 'removed'}
        : currentState
    case 'finish':
      return {status: 'idle'}
  }

  const unreachableEvent: never = event
  throw new Error(`Unsupported memory memo delivery event: ${String(unreachableEvent)}`)
}
