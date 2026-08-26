import {describe, expect, it, vi} from 'vitest'

import {failureResult, successResult} from '../../result'
import {
  createSpeechModelOwner,
  type CreateSpeechRecognizerOptions,
  type SpeechRecognizer,
} from '../index'

const createDeferred = <Value>() => {
  let resolve: (value: Value) => void = () => undefined
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise
  })
  return {promise, resolve}
}

const createSuccessfulRecognizer = (): SpeechRecognizer => ({
  dispose: vi.fn(),
  prepare: vi.fn(async () => successResult({backend: 'wasm' as const})),
  transcribe: vi.fn(async () => successResult({backend: 'wasm' as const, text: '완료'})),
})

describe('createSpeechModelOwner', () => {
  it('should replace a failed Worker session before retrying', async () => {
    const failedRecognizer: SpeechRecognizer = {
      ...createSuccessfulRecognizer(),
      prepare: vi.fn(async () =>
        failureResult({
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
      modelId: 'whisper-tiny',
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
    const createRecognizer = vi.fn(() => recognizer)
    const owner = createSpeechModelOwner({
      createRecognizer,
      isDisposed: () => false,
      language: 'ko',
      modelId: 'moonshine-tiny-ko',
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
    expect(createRecognizer).toHaveBeenCalledWith(
      expect.objectContaining({modelId: 'moonshine-tiny-ko'}),
    )
  })

  it('should share concurrent preparation, publish progress, and reuse the ready backend', async () => {
    const preparation = createDeferred<Awaited<ReturnType<SpeechRecognizer['prepare']>>>()
    const recognizer: SpeechRecognizer = {
      ...createSuccessfulRecognizer(),
      prepare: vi.fn(() => preparation.promise),
    }
    let recognizerOptions: CreateSpeechRecognizerOptions | undefined
    const createRecognizer = vi.fn((options: CreateSpeechRecognizerOptions) => {
      recognizerOptions = options
      return recognizer
    })
    const onStateChange = vi.fn()
    const owner = createSpeechModelOwner({
      createRecognizer,
      isDisposed: () => false,
      language: 'ko',
      modelId: 'whisper-tiny',
      onBackendChange: vi.fn(),
      onError: vi.fn(),
      onStateChange,
      preferredBackend: 'webgpu',
    })

    const firstPreparation = owner.prepare()
    const secondPreparation = owner.prepare()
    recognizerOptions?.onProgress(0.4)

    expect(secondPreparation).toBe(firstPreparation)
    expect(onStateChange).toHaveBeenCalledWith({progress: 0.4, status: 'loading'})

    const ready = successResult({backend: 'webgpu' as const})
    preparation.resolve(ready)
    await expect(firstPreparation).resolves.toEqual(ready)
    await expect(owner.prepare()).resolves.toEqual(ready)
    expect(recognizer.prepare).toHaveBeenCalledOnce()
  })

  it('should suppress late progress and ready state after disposal', async () => {
    const preparation = createDeferred<Awaited<ReturnType<SpeechRecognizer['prepare']>>>()
    const recognizer: SpeechRecognizer = {
      ...createSuccessfulRecognizer(),
      prepare: vi.fn(() => preparation.promise),
    }
    let isDisposed = false
    let recognizerOptions: CreateSpeechRecognizerOptions | undefined
    const onStateChange = vi.fn()
    const owner = createSpeechModelOwner({
      createRecognizer: (options) => {
        recognizerOptions = options
        return recognizer
      },
      isDisposed: () => isDisposed,
      language: 'ko',
      modelId: 'whisper-tiny',
      onBackendChange: vi.fn(),
      onError: vi.fn(),
      onStateChange,
      preferredBackend: 'wasm',
    })

    const result = owner.prepare()
    isDisposed = true
    recognizerOptions?.onProgress(0.8)
    owner.dispose()
    preparation.resolve(successResult({backend: 'wasm' as const}))

    await expect(result).resolves.toEqual({ok: true, value: {backend: 'wasm'}})
    expect(recognizer.dispose).toHaveBeenCalledOnce()
    expect(onStateChange).toHaveBeenCalledTimes(1)
    expect(onStateChange).toHaveBeenCalledWith({progress: 0, status: 'loading'})
  })

  it('should return a model preparation failure without invoking transcription', async () => {
    const modelFailure = failureResult({
      code: 'model-failed' as const,
      detail: 'download failed',
      phase: 'prepare' as const,
      retryable: true,
    })
    const recognizer: SpeechRecognizer = {
      ...createSuccessfulRecognizer(),
      prepare: vi.fn(async () => modelFailure),
    }
    const onError = vi.fn()
    const owner = createSpeechModelOwner({
      createRecognizer: () => recognizer,
      isDisposed: () => false,
      language: 'ko',
      modelId: 'whisper-tiny',
      onBackendChange: vi.fn(),
      onError,
      onStateChange: vi.fn(),
      preferredBackend: 'wasm',
    })

    await expect(owner.transcribe(Float32Array.of(0.1))).resolves.toEqual(modelFailure)
    expect(onError).toHaveBeenCalledWith(modelFailure.error)
    expect(recognizer.transcribe).not.toHaveBeenCalled()
    expect(recognizer.dispose).not.toHaveBeenCalled()
  })

  it('should report a transcription failure without replacing a healthy recognizer', async () => {
    const transcriptionFailure = failureResult({
      code: 'busy' as const,
      phase: 'transcribe' as const,
      retryable: true as const,
    })
    const recognizer: SpeechRecognizer = {
      ...createSuccessfulRecognizer(),
      transcribe: vi.fn(async () => transcriptionFailure),
    }
    const onError = vi.fn()
    const owner = createSpeechModelOwner({
      createRecognizer: () => recognizer,
      isDisposed: () => false,
      language: 'ko',
      modelId: 'whisper-tiny',
      onBackendChange: vi.fn(),
      onError,
      onStateChange: vi.fn(),
      preferredBackend: 'wasm',
    })

    await expect(owner.transcribe(Float32Array.of(0.1))).resolves.toEqual(transcriptionFailure)
    expect(onError).toHaveBeenCalledWith(transcriptionFailure.error)
    expect(recognizer.dispose).not.toHaveBeenCalled()
  })
})
