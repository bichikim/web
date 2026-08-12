export type SpeechRecognitionPhase = 'prepare' | 'transcribe'

interface SpeechRecognitionErrorBase {
  readonly phase: SpeechRecognitionPhase
  readonly retryable: boolean
}

export interface SpeechCancelledError extends SpeechRecognitionErrorBase {
  readonly code: 'cancelled'
  readonly retryable: false
}

export interface SpeechBusyError extends SpeechRecognitionErrorBase {
  readonly code: 'busy'
  readonly phase: 'transcribe'
  readonly retryable: true
}

export interface SpeechModelError extends SpeechRecognitionErrorBase {
  readonly code: 'model-failed'
  readonly detail: string
}

export interface SpeechTranscriptionError extends SpeechRecognitionErrorBase {
  readonly code: 'transcription-failed'
  readonly detail: string
  readonly phase: 'transcribe'
}

export interface SpeechWorkerError extends SpeechRecognitionErrorBase {
  readonly code: 'worker-failed'
  readonly detail: string
  readonly retryable: true
}

export type SpeechRecognitionError =
  | SpeechBusyError
  | SpeechCancelledError
  | SpeechModelError
  | SpeechTranscriptionError
  | SpeechWorkerError

export interface SpeechCaptureError {
  readonly code:
    | 'capture-busy'
    | 'capture-cancelled'
    | 'capture-failed'
    | 'capture-too-short'
    | 'device-not-found'
    | 'permission-denied'
    | 'unsupported'
  readonly detail?: string
  readonly retryable: boolean
}

export const getSpeechErrorMessage = (error: SpeechCaptureError | SpeechRecognitionError) => {
  switch (error.code) {
    case 'busy':
      return '이미 다른 음성을 처리하고 있어요.'
    case 'cancelled':
      return '음성 처리가 취소됐어요.'
    case 'capture-busy':
      return '이미 마이크를 사용하고 있어요.'
    case 'capture-cancelled':
      return '녹음이 취소됐어요.'
    case 'capture-failed':
      return error.detail ?? '마이크를 시작하지 못했어요.'
    case 'capture-too-short':
      return '녹음이 너무 짧아요. 한 문장 정도 말한 뒤 다시 눌러 주세요.'
    case 'device-not-found':
      return '사용할 수 있는 마이크를 찾지 못했어요.'
    case 'model-failed':
      return '음성 인식 모델을 준비하지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.'
    case 'permission-denied':
      return '마이크 권한이 필요해요. 브라우저 주소창에서 권한을 허용해 주세요.'
    case 'transcription-failed':
      return '음성을 글로 바꾸지 못했어요. 다시 녹음해 주세요.'
    case 'unsupported':
      return '이 브라우저는 마이크 녹음을 지원하지 않아요.'
    case 'worker-failed':
      return '음성 인식 실행 환경이 중단됐어요. 다시 시도해 주세요.'
  }

  error satisfies never
}
