import {
  createRecognizer,
  createRecording,
  createRuntime,
  createSpeechRoot,
} from './fixtures/runtime'
import {createDeferred} from 'src/__tests__/create-deferred'
import {afterEach, describe, expect, it, vi} from 'vitest'

const dependencyMocks = vi.hoisted(() => ({
  createBrowserSpeechRecorder: vi.fn(),
  createSpeechRecognizer: vi.fn(),
}))

vi.mock('../browser-recorder', () => ({
  createBrowserSpeechRecorder: dependencyMocks.createBrowserSpeechRecorder,
}))

vi.mock('../client', () => ({createSpeechRecognizer: dependencyMocks.createSpeechRecognizer}))

import {
  type CreateSpeechRecognizerOptions,
  type SpeechBackend,
  type SpeechRecognizer,
  type SpeechRecorder,
  type SpeechToTextRuntime,
} from '..'
import {failureResult, successResult} from 'src/features/result'

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('model lifecycle', () => {
  it('should expose loading progress and the ready backend', async () => {
    const preparation = createDeferred<ReturnType<typeof successResult<{backend: 'webgpu'}>>>()
    const recognizer = createRecognizer()
    vi.mocked(recognizer.prepare).mockReturnValue(preparation.promise)
    let recognizerOptions: CreateSpeechRecognizerOptions | undefined
    const recording = createRecording()
    const runtime: SpeechToTextRuntime = {
      createRecognizer: vi.fn((options) => {
        recognizerOptions = options
        return recognizer
      }),
      createRecorder: vi.fn(() => ({
        isSupported: () => true,
        start: vi.fn(async () => successResult(recording)),
      })),
      getPreferredBackend: vi.fn((): SpeechBackend => 'webgpu'),
    }
    const root = createSpeechRoot(runtime, {modelId: 'whisper-tiny'})

    expect(root.controller.modelProgress()).toBe(0)
    await root.controller.startRecording()
    recognizerOptions?.onProgress(42)
    expect(root.controller.modelProgress()).toBe(42)
    preparation.resolve(successResult({backend: 'webgpu'}))
    await vi.waitFor(() => expect(root.controller.modelState().status).toBe('ready'))

    expect(root.controller.modelProgress()).toBe(100)
    expect(root.controller.backend()).toBe('webgpu')
    expect(recognizerOptions?.modelId).toBe('whisper-tiny')
    root.dispose()
  })

  it.each([
    ['an Error', new Error('model preparation exploded'), 'model preparation exploded'],
    ['a non-Error', 'model preparation exploded', '음성 인식 모델 준비 오류'],
  ])('should recover when preparation rejects with %s', async (_name, reason, message) => {
    const recognizer = createRecognizer()
    vi.mocked(recognizer.prepare).mockRejectedValue(reason)
    const recording = createRecording()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, recognizer))

    await root.controller.startRecording()
    await vi.waitFor(() => expect(root.controller.errorMessage()).toBe(message))

    expect(root.controller.modelState()).toEqual({status: 'idle'})
    root.dispose()
  })

  it('should ignore a preparation rejection after disposal', async () => {
    const preparation = createDeferred<Awaited<ReturnType<SpeechRecognizer['prepare']>>>()
    const recognizer = createRecognizer()
    vi.mocked(recognizer.prepare).mockReturnValue(preparation.promise)
    const recording = createRecording()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, recognizer))
    await root.controller.startRecording()

    root.dispose()
    preparation.reject(new Error('late preparation failure'))
    await vi.waitFor(() => expect(recognizer.dispose).toHaveBeenCalled())
    await Promise.resolve()

    expect(root.controller.errorMessage()).toBeNull()
  })

  it('should expose a recognition failure without publishing text', async () => {
    const recording = createRecording()
    const recognizer = createRecognizer()
    vi.mocked(recognizer.transcribe).mockResolvedValue(
      failureResult({
        code: 'transcription-failed',
        detail: 'recognition failed',
        phase: 'transcribe',
        retryable: true,
      }),
    )
    const onTranscript = vi.fn()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, recognizer), {onTranscript})

    await root.controller.startRecording()
    await root.controller.stopRecording()

    expect(root.controller.errorMessage()).toContain('글로 바꾸지 못했어요')
    expect(onTranscript).not.toHaveBeenCalled()
    root.dispose()
  })

  it('should omit accumulation and ignore a blank transcript', async () => {
    const recording = createRecording()
    const recognizer = createRecognizer()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const onTranscript = vi.fn()
    const root = createSpeechRoot(createRuntime(recorder, recognizer), {
      accumulateText: false,
      onTranscript,
    })

    root.controller.setText('preserved')
    await root.controller.startRecording()
    await root.controller.stopRecording()
    expect(root.controller.text()).toBe('preserved')
    expect(onTranscript).toHaveBeenCalledWith('테스트 문장')

    vi.mocked(recognizer.transcribe).mockResolvedValue(
      successResult({backend: 'wasm', text: '   '}),
    )
    await root.controller.startRecording()
    await root.controller.stopRecording()
    expect(onTranscript).toHaveBeenCalledTimes(1)
    root.dispose()
  })

  it('should allow transcription without a callback', async () => {
    const recording = createRecording()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    await root.controller.startRecording()
    await root.controller.stopRecording()

    expect(root.controller.text()).toBe('테스트 문장')
    root.dispose()
  })
})
