import {describe, expect, it, vi} from 'vitest'

import {createSpeechModelOwner, speechFailure, type SpeechRecognizer, speechSuccess} from '../index'

const createSuccessfulRecognizer = (): SpeechRecognizer => ({
  dispose: vi.fn(),
  prepare: vi.fn(async () => speechSuccess({backend: 'wasm' as const})),
  transcribe: vi.fn(async () => speechSuccess({backend: 'wasm' as const, text: '완료'})),
})

describe('createSpeechModelOwner', () => {
  it('should replace a failed Worker session before retrying', async () => {
    const failedRecognizer: SpeechRecognizer = {
      ...createSuccessfulRecognizer(),
      prepare: vi.fn(async () =>
        speechFailure({
          code: 'worker-failed' as const,
          detail: 'Worker 중단',
          phase: 'prepare' as const,
          retryable: true as const,
        }),
      ),
    }
    const recoveredRecognizer = createSuccessfulRecognizer()
    const recognizers = [failedRecognizer, recoveredRecognizer]
    const createRecognizer = vi.fn(() => {
      const recognizer = recognizers.shift()

      if (recognizer === undefined) {
        throw new Error('테스트 recognizer가 부족합니다.')
      }

      return recognizer
    })
    const onStateChange = vi.fn()
    const owner = createSpeechModelOwner({
      createRecognizer,
      isDisposed: () => false,
      language: 'korean',
      onBackendChange: vi.fn(),
      onError: vi.fn(),
      onStateChange,
      preferredBackend: 'webgpu',
    })

    await expect(owner.prepare()).resolves.toMatchObject({
      error: {code: 'worker-failed'},
      ok: false,
    })
    expect(failedRecognizer.dispose).toHaveBeenCalledTimes(1)
    await expect(owner.prepare()).resolves.toEqual({ok: true, value: {backend: 'wasm'}})
    expect(createRecognizer).toHaveBeenCalledTimes(2)
    expect(onStateChange).toHaveBeenLastCalledWith({backend: 'wasm', status: 'ready'})
  })

  it('should forward the configured language without exposing the recognizer implementation', async () => {
    const recognizer = createSuccessfulRecognizer()
    const owner = createSpeechModelOwner({
      createRecognizer: () => recognizer,
      isDisposed: () => false,
      language: 'ko',
      onBackendChange: vi.fn(),
      onError: vi.fn(),
      onStateChange: vi.fn(),
      preferredBackend: 'wasm',
    })

    const audio = Float32Array.of(0.1)
    await expect(owner.transcribe(audio)).resolves.toEqual({
      ok: true,
      value: {backend: 'wasm', text: '완료'},
    })
    expect(recognizer.transcribe).toHaveBeenCalledWith({audio, language: 'ko'})
  })
})
