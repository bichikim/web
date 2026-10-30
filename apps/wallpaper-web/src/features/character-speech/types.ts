import type {Result} from '@winter-love/supertonic/result'

export interface SpeechAudio {
  readonly sampleRate: number
  readonly samples: Float32Array
}

export interface MouthPose {
  readonly open: number
  readonly form: number
}

export interface SpeechMouthTrack {
  readonly duration: number
  readonly step: number
  /** Interleaved open/form values sampled at `step` seconds. */
  readonly frames: Float32Array
}

export interface CachedSpeech {
  readonly audio: Blob
  readonly mouth: SpeechMouthTrack
}

export interface PreparedSpeechPlayback {
  readonly audio: AudioBuffer
  readonly mouth: SpeechMouthTrack
}

export type SpeechStatus =
  | {readonly phase: 'idle'}
  | {readonly phase: 'preparing'}
  | {readonly phase: 'downloading'; readonly percent: number}
  | {readonly phase: 'generating'}
  | {readonly phase: 'playing'}
  | {readonly phase: 'error'}

export type SpeechResult =
  | {readonly ok: true}
  | {readonly ok: false; readonly error: 'cancelled' | 'unavailable'}

export interface SpeechObserver {
  readonly onCacheError?: () => void
  readonly onMouth: (pose: MouthPose | null) => void
  readonly onStatus: (status: SpeechStatus) => void
}

export type SpeechCommand =
  | {readonly type: 'generate'; readonly id: number; readonly text: string}
  | {readonly type: 'cancel'; readonly id: number}

export type SpeechReply =
  | {readonly type: 'status'; readonly id: number; readonly status: SpeechStatus}
  | {readonly type: 'audio'; readonly id: number; readonly audio: Blob}
  | {readonly type: 'error'; readonly id: number}

export interface SpeechSession {
  readonly unlock: () => Promise<void>
  readonly speak: (
    text: string,
    signal: AbortSignal,
    observer: SpeechObserver,
  ) => Promise<SpeechResult>
  readonly dispose: () => void
}

export interface SpeechCache {
  readonly read: (key: string) => Promise<Result<CachedSpeech | null, 'unavailable'>>
  readonly write: (key: string, clip: CachedSpeech) => Promise<Result<void, 'unavailable'>>
  readonly remove: (key: string) => Promise<Result<void, 'unavailable'>>
}

export interface SpeechSynthesis {
  readonly generate: (
    text: string,
    signal: AbortSignal,
    onStatus: (status: SpeechStatus) => void,
  ) => Promise<Blob>
  readonly dispose: () => void
}

export interface SpeechFrames {
  readonly request: (callback: FrameRequestCallback) => number
  readonly cancel: (handle: number) => void
}

export type SpeechAudioContext = Pick<
  AudioContext,
  'resume' | 'close' | 'decodeAudioData' | 'createBufferSource' | 'currentTime' | 'destination'
>

export interface CreateSpeechSessionOptions {
  /** 세션이 소유하며 dispose에서 닫는 오디오 컨텍스트. */
  readonly context: SpeechAudioContext
  /** 캐시 미스에만 생성하며 오류 또는 세션 종료 때 해제할 합성 클라이언트. */
  readonly createSynthesis: () => SpeechSynthesis
  /** MP3와 입 모양을 함께 읽고 저장하는 영속 저장소. */
  readonly cache: SpeechCache
  /** 정규화된 대사에 대한 기존 음성 프로필의 캐시 키를 계산한다. */
  readonly getCacheKey: (text: string) => Promise<string>
  /** 정해진 대사의 MP3와 입 모양 에셋을 가져온다. */
  readonly fetch: typeof fetch
  /** 오디오 시계에 맞춘 입 모양 갱신을 예약하고 취소한다. */
  readonly frames: SpeechFrames
}
