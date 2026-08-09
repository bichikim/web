import {describe, expect, it} from 'vitest'

import {getSupertonicErrorMessage} from '../error-message'
import {getErrorDetail, type SupertonicError} from '../errors'
import {failureResult, successResult} from '../result'

describe('Supertonic Result', () => {
  it('should represent success and failure without throwing', () => {
    expect(successResult('audio')).toEqual({ok: true, value: 'audio'})
    expect(failureResult({code: 'failure'})).toEqual({error: {code: 'failure'}, ok: false})
  })
})

describe('getSupertonicErrorMessage', () => {
  it('should translate every domain error into a user-facing message', () => {
    const errors: ReadonlyArray<SupertonicError> = [
      {
        backend: 'webgpu',
        code: 'backend-failed',
        detail: 'GPU 오류',
        phase: 'initialize',
        retryable: true,
      },
      {code: 'cancelled', phase: 'generate', retryable: false},
      {
        code: 'download-failed',
        fileName: '모델',
        phase: 'download',
        retryable: true,
        status: 503,
      },
      {code: 'generation-busy', phase: 'generate', retryable: true},
      {
        asset: 'voice',
        code: 'invalid-model-data',
        phase: 'validate',
        retryable: false,
      },
      {
        code: 'invalid-model',
        modelId: 'unknown',
        phase: 'initialize',
        retryable: false,
      },
      {code: 'model-not-ready', phase: 'generate', retryable: false},
      {
        code: 'worker-failed',
        detail: 'Worker 오류',
        phase: 'generate',
        retryable: true,
      },
    ]

    expect(errors.map((error) => getSupertonicErrorMessage(error))).toEqual([
      'WEBGPU 음성 엔진을 준비하지 못했어요.',
      'Supertonic 작업이 취소됐어요.',
      '모델 다운로드에 실패했어요. (503)',
      '다른 음성을 만들고 있어요.',
      'Supertonic 모델 데이터 형식이 올바르지 않아요.',
      '지원하지 않는 Supertonic 모델이에요.',
      'Supertonic 모델을 먼저 준비해 주세요.',
      'Supertonic 음성 엔진을 실행하지 못했어요.',
    ])
  })

  it('should omit an HTTP status when a network failure has no response', () => {
    expect(
      getSupertonicErrorMessage({
        code: 'download-failed',
        fileName: '모델',
        phase: 'download',
        retryable: true,
        status: null,
      }),
    ).toBe('모델 다운로드에 실패했어요.')
  })
})

describe('getErrorDetail', () => {
  it('should preserve Error messages and normalize unknown thrown values', () => {
    expect(getErrorDetail(new Error('ONNX 실패'))).toBe('ONNX 실패')
    expect(getErrorDetail({reason: 'unknown'})).toBe('알 수 없는 오류')
  })
})
