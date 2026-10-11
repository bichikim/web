/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

import {failureResult, successResult} from '../features/result'
import {createSpeechModelOwner} from '../features/speech-to-text/speech-model-owner'

describe('speech model owner send failure', () => {
  it('should keep a prepared recognizer after a recoverable transcription postMessage failure', async () => {
    const sendFailure = failureResult({
      code: 'worker-failed' as const,
      detail: '복제 실패',
      phase: 'transcribe' as const,
      retryable: true as const,
    })
    const recognizer = {
      dispose: vi.fn(),
      prepare: vi.fn(async () => successResult({backend: 'wasm' as const})),
      transcribe: vi
        .fn()
        .mockResolvedValueOnce(sendFailure)
        .mockResolvedValueOnce(successResult({backend: 'wasm' as const, text: '다시'})),
    }
    const owner = createSpeechModelOwner({
      createRecognizer: () => recognizer,
      isDisposed: () => false,
      language: 'ko',
      modelId: 'whisper-tiny',
      onBackendChange: vi.fn(),
      onError: vi.fn(),
      onStateChange: vi.fn(),
      preferredBackend: 'wasm',
    })

    await expect(owner.transcribe(Float32Array.of(0.1))).resolves.toEqual(sendFailure)
    expect(recognizer.dispose).not.toHaveBeenCalled()

    await expect(owner.transcribe(Float32Array.of(0.2))).resolves.toEqual({
      ok: true,
      value: {backend: 'wasm', text: '다시'},
    })
    expect(recognizer.prepare).toHaveBeenCalledOnce()
  })
})
