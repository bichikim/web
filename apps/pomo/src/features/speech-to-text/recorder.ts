import type {SpeechCaptureError} from './errors'
import type {Result} from '../result'

export interface SpeechRecording {
  readonly cancel: () => void
  readonly onSpeechEnd: (handler: () => void) => () => void
  readonly stop: () => Promise<Result<Float32Array, SpeechCaptureError>>
  readonly takeSegment: () => Promise<Result<Float32Array, SpeechCaptureError>>
}

export interface SpeechRecorder {
  readonly isSupported: () => boolean
  readonly start: () => Promise<Result<SpeechRecording, SpeechCaptureError>>
}
