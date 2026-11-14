import type {MotionEvent} from './playback/types'

interface MotionEventNotice {
  readonly kind: 'event'
  readonly event: MotionEvent
}
interface CompletionNotice {
  readonly kind: 'completion'
  readonly completion: number
}
interface SequencedMotionEvent extends MotionEventNotice {
  readonly sequence: number
}
interface SequencedCompletion extends CompletionNotice {
  readonly sequence: number
}
export type RuntimeNoticeInput = MotionEventNotice | CompletionNotice
export type RuntimeNotice = SequencedMotionEvent | SequencedCompletion

export interface RuntimeNoticesState {
  readonly pending: ReadonlyArray<RuntimeNotice>
  readonly sequence: number
}
