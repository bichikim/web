import {expect, it} from 'vitest'

import {
  getSpeechErrorMessage,
  type SpeechCaptureError,
  type SpeechRecognitionError,
} from '../errors'

it.each([
  [{code: 'busy', phase: 'transcribe', retryable: true}, '이미 다른 음성을 처리하고 있어요.'],
  [{code: 'cancelled', phase: 'prepare', retryable: false}, '음성 처리가 취소됐어요.'],
  [{code: 'capture-busy', retryable: true}, '이미 마이크를 사용하고 있어요.'],
  [{code: 'capture-cancelled', retryable: false}, '녹음이 취소됐어요.'],
  [
    {code: 'capture-too-short', retryable: true},
    '녹음이 너무 짧아요. 한 문장 정도 말한 뒤 다시 눌러 주세요.',
  ],
  [{code: 'device-not-found', retryable: true}, '사용할 수 있는 마이크를 찾지 못했어요.'],
  [
    {code: 'model-failed', detail: 'model', phase: 'prepare', retryable: true},
    '음성 인식 모델을 준비하지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.',
  ],
  [
    {code: 'permission-denied', retryable: false},
    '마이크 권한이 필요해요. 브라우저 주소창에서 권한을 허용해 주세요.',
  ],
  [
    {code: 'transcription-failed', detail: 'transcribe', phase: 'transcribe', retryable: true},
    '음성을 글로 바꾸지 못했어요. 다시 녹음해 주세요.',
  ],
  [{code: 'unsupported', retryable: false}, '이 브라우저는 마이크 녹음을 지원하지 않아요.'],
  [
    {code: 'worker-failed', detail: 'worker', phase: 'prepare', retryable: true},
    '음성 인식 실행 환경이 중단됐어요. 다시 시도해 주세요.',
  ],
] satisfies ReadonlyArray<readonly [SpeechCaptureError | SpeechRecognitionError, string]>)(
  'should map $0.code to its Korean user message',
  (error, message) => {
    expect(getSpeechErrorMessage(error)).toBe(message)
  },
)

it('should preserve capture failure detail and provide its fallback', () => {
  expect(
    getSpeechErrorMessage({
      code: 'capture-failed',
      detail: '장치를 열지 못했어요.',
      retryable: true,
    }),
  ).toBe('장치를 열지 못했어요.')
  expect(getSpeechErrorMessage({code: 'capture-failed', retryable: true})).toBe(
    '마이크를 시작하지 못했어요.',
  )
})
