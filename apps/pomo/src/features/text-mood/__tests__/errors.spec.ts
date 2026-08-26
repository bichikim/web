import {expect, it} from 'vitest'

import {getTextMoodErrorMessage, type TextMoodError} from '../errors'

it.each([
  ['cancelled', undefined, '분위기 분석을 취소했어요.'],
  ['classification-failed', undefined, '문장의 분위기를 분석하지 못했어요.'],
  ['classification-failed', '분류 상세', '분류 상세'],
  ['invalid-input', undefined, '분석할 문장을 입력해 주세요.'],
  ['model-failed', undefined, '분위기 분석 모델을 준비하지 못했어요.'],
  ['model-failed', '모델 상세', '모델 상세'],
  ['worker-failed', undefined, '분위기 분석 Worker를 실행하지 못했어요.'],
  ['worker-failed', 'Worker 상세', 'Worker 상세'],
] as const)('should map %s errors to their user message', (code, detail, expected) => {
  expect(getTextMoodErrorMessage({code, detail, phase: 'analyze', retryable: false})).toBe(expected)
})

it('should safely return no message for an unexpected error code', () => {
  expect(
    getTextMoodErrorMessage({
      code: 'unexpected',
      phase: 'prepare',
      retryable: false,
    } as unknown as TextMoodError),
  ).toBeUndefined()
})
