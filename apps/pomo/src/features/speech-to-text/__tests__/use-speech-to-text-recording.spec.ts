import {createRoot} from 'solid-js'
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
  type SpeechRecording,
  type SpeechToTextController,
  type SpeechToTextRuntime,
  useSpeechToText,
  type UseSpeechToTextProps,
} from '../index'
import {failureResult, successResult} from '../../result'

interface SpeechTestRoot {
  readonly controller: SpeechToTextController
  readonly dispose: () => void
}

const createDeferred = <Value>() => {
  let resolvePromise: (value: Value) => void = () => undefined
  let rejectPromise: (reason?: unknown) => void = () => undefined
  const promise = new Promise<Value>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })
  return {promise, reject: rejectPromise, resolve: resolvePromise}
}

const createRecording = (): SpeechRecording => ({
  cancel: vi.fn(),
  onSpeechEnd: vi.fn(() => () => undefined),
  stop: vi.fn(async () => successResult(new Float32Array(4_000).fill(0.1))),
  takeSegment: vi.fn(async () => successResult(new Float32Array(4_000).fill(0.1))),
})

const createRecognizer = (): SpeechRecognizer => ({
  dispose: vi.fn(),
  prepare: vi.fn(async () => successResult({backend: 'wasm' as const})),
  transcribe: vi.fn(async () => successResult({backend: 'wasm' as const, text: '테스트 문장'})),
})

const createRuntime = (
  recorder: SpeechRecorder,
  recognizer: SpeechRecognizer,
): SpeechToTextRuntime => ({
  createRecognizer: vi.fn(() => recognizer),
  createRecorder: vi.fn(() => recorder),
  getPreferredBackend: vi.fn((): SpeechBackend => 'wasm'),
})

const createSpeechRoot = (
  runtime: SpeechToTextRuntime,
  props: Omit<UseSpeechToTextProps, 'runtime'> = {},
): SpeechTestRoot => {
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useSpeechToText({...props, runtime})
  })
  return {controller, dispose: disposeRoot}
}

const createDefaultSpeechRoot = (props: UseSpeechToTextProps = {}): SpeechTestRoot => {
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useSpeechToText(props)
  })
  return {controller, dispose: disposeRoot}
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('recording lifecycle', () => {
  it('should expose elapsed recording time and stop an active timer', async () => {
    vi.useFakeTimers()
    const recording = createRecording()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    await root.controller.startRecording()
    await vi.advanceTimersByTimeAsync(500)

    expect(root.controller.elapsedTime()).toBe(0.5)
    await root.controller.stopRecording()
    const stoppedAt = root.controller.elapsedTime()
    await vi.advanceTimersByTimeAsync(500)
    expect(root.controller.elapsedTime()).toBe(stoppedAt)
    root.dispose()
  })

  it('should ignore a stop request when recording is inactive', async () => {
    const recorder: SpeechRecorder = {isSupported: () => true, start: vi.fn()}
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    await expect(root.controller.stopRecording()).resolves.toBeUndefined()

    expect(recorder.start).not.toHaveBeenCalled()
    root.dispose()
  })

  it('should expose recorder stop failures and short captures', async () => {
    const failedRecording = createRecording()
    vi.mocked(failedRecording.stop).mockResolvedValue(
      failureResult({code: 'capture-failed', detail: 'microphone failed', retryable: true}),
    )
    const shortRecording = createRecording()
    vi.mocked(shortRecording.stop).mockResolvedValue(successResult(new Float32Array(3999)))
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi
        .fn()
        .mockResolvedValueOnce(successResult(failedRecording))
        .mockResolvedValueOnce(successResult(shortRecording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    await root.controller.startRecording()
    await root.controller.stopRecording()
    expect(root.controller.errorMessage()).toBe('microphone failed')

    await root.controller.startRecording()
    await root.controller.stopRecording()
    expect(root.controller.errorMessage()).toContain('녹음이 너무 짧아요')
    root.dispose()
  })

  it('should ignore a stop result that resolves after disposal', async () => {
    const stopResult = createDeferred<ReturnType<typeof successResult<Float32Array>>>()
    const recording = createRecording()
    vi.mocked(recording.stop).mockReturnValue(stopResult.promise)
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))
    await root.controller.startRecording()

    const stopping = root.controller.stopRecording()
    root.dispose()
    stopResult.resolve(successResult(new Float32Array(4000)))
    await stopping

    expect(root.controller.activity()).toBe('processing')
  })

  it('should not restore idle after transcription completes following disposal', async () => {
    const transcription =
      createDeferred<ReturnType<typeof successResult<{backend: 'wasm'; text: string}>>>()
    const recording = createRecording()
    const recognizer = createRecognizer()
    vi.mocked(recognizer.transcribe).mockReturnValue(transcription.promise)
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, recognizer))
    await root.controller.startRecording()

    const stopping = root.controller.stopRecording()
    await vi.waitFor(() => expect(recognizer.transcribe).toHaveBeenCalled())
    root.dispose()
    transcription.resolve(successResult({backend: 'wasm', text: 'late transcript'}))
    await stopping

    expect(root.controller.activity()).toBe('processing')
  })
})
