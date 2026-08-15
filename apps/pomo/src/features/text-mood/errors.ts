export type TextMoodPhase = 'analyze' | 'prepare'

export interface TextMoodError {
  readonly code:
    | 'cancelled'
    | 'classification-failed'
    | 'invalid-input'
    | 'model-failed'
    | 'worker-failed'
  readonly detail?: string
  readonly phase: TextMoodPhase
  readonly retryable: boolean
}

export const getTextMoodErrorMessage = (error: TextMoodError) => {
  switch (error.code) {
    case 'cancelled':
      return '분위기 분석을 취소했어요.'
    case 'classification-failed':
      return error.detail ?? '문장의 분위기를 분석하지 못했어요.'
    case 'invalid-input':
      return '분석할 문장을 입력해 주세요.'
    case 'model-failed':
      return error.detail ?? '분위기 분석 모델을 준비하지 못했어요.'
    case 'worker-failed':
      return error.detail ?? '분위기 분석 Worker를 실행하지 못했어요.'
  }

  error.code satisfies never
}
