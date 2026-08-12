import type {SpeechCaptureError} from './errors'
import type {SpeechResult} from './result'

export interface SpeechRecording {
  readonly cancel: () => void
  readonly onSpeechEnd: (handler: () => void) => () => void
  readonly stop: () => Promise<SpeechResult<Float32Array, SpeechCaptureError>>
  readonly takeSegment: () => Promise<SpeechResult<Float32Array, SpeechCaptureError>>
}

export interface SpeechRecorder {
  readonly isSupported: () => boolean
  readonly start: () => Promise<SpeechResult<SpeechRecording, SpeechCaptureError>>
}
