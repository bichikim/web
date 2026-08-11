import type {SpeechCaptureError} from './errors'
import type {SpeechResult} from './result'

export interface SpeechRecording {
  readonly cancel: () => void
  readonly stop: () => Promise<SpeechResult<Float32Array, SpeechCaptureError>>
}

export interface SpeechRecorder {
  readonly isSupported: () => boolean
  readonly start: () => Promise<SpeechResult<SpeechRecording, SpeechCaptureError>>
}
