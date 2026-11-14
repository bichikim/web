import type {SpeechAudio, SpeechCommand} from '../types'

/** 생성 요청은 처리 완료를 반환하고 취소 명령은 즉시 적용한다. */
export type SpeechCommandHandler = (command: SpeechCommand) => Promise<void> | undefined

export interface SpeechEngine {
  /** 초기화된 엔진에서 대사를 합성하며 요청 취소 신호를 전달한다. */
  readonly generate: (text: string, signal: AbortSignal) => Promise<SpeechAudio>
}
