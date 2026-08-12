import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  type SpeechBackend,
  speechFailure,
  type SpeechRecognizer,
  type SpeechRecorder,
  type SpeechRecording,
  speechSuccess,
  type SpeechToTextController,
  type SpeechToTextRuntime,
  useSpeechToText,
  type UseSpeechToTextProps,
} from '../index'

interface SpeechTestRoot {
  readonly controller: SpeechToTextController
  readonly dispose: () => void
}

const createDeferred = <Value>() => {
  let resolvePromise: (value: Value) => void = () => undefined
  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve
  })
  return {promise, resolve: resolvePromise}
}

const createRecording = (): SpeechRecording => ({
  cancel: vi.fn(),
  onSpeechEnd: vi.fn(() => () => undefined),
  stop: vi.fn(async () => speechSuccess(new Float32Array(4_000).fill(0.1))),
  takeSegment: vi.fn(async () => speechSuccess(new Float32Array(4_000).fill(0.1))),
})

const createRecognizer = (): SpeechRecognizer => ({
  dispose: vi.fn(),
  prepare: vi.fn(async () => speechSuccess({backend: 'wasm' as const})),
  transcribe: vi.fn(async () => speechSuccess({backend: 'wasm' as const, text: '테스트 문장'})),
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

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('useSpeechToText', () => {
  it('should prevent duplicate capture while microphone permission is pending', async () => {
    const startResult = createDeferred<ReturnType<typeof speechSuccess<SpeechRecording>>>()
    const recording = createRecording()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(() => startResult.promise),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    const firstStart = root.controller.startRecording()
    const secondStart = root.controller.startRecording()
    expect(root.controller.activity()).toBe('requesting')
    expect(recorder.start).toHaveBeenCalledTimes(1)

    startResult.resolve(speechSuccess(recording))
    await Promise.all([firstStart, secondStart])
    expect(root.controller.activity()).toBe('recording')
    root.dispose()
    expect(recording.cancel).toHaveBeenCalledTimes(1)
  })

  it('should prepare, transcribe, append text, and release owned resources', async () => {
    const recording = createRecording()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => speechSuccess(recording)),
    }
    const recognizer = createRecognizer()
    const onTranscript = vi.fn()
    const root = createSpeechRoot(createRuntime(recorder, recognizer), {onTranscript})

    root.controller.setText('기존 문장')
    await root.controller.startRecording()
    expect(onTranscript).not.toHaveBeenCalled()
    await root.controller.stopRecording()

    expect(recognizer.prepare).toHaveBeenCalledTimes(1)
    expect(recognizer.transcribe).toHaveBeenCalledWith({
      audio: expect.any(Float32Array),
      language: 'korean',
    })
    expect(root.controller.text()).toBe('기존 문장 테스트 문장')
    expect(onTranscript).toHaveBeenCalledWith('테스트 문장')
    expect(root.controller.activity()).toBe('idle')
    root.dispose()
    expect(recognizer.dispose).toHaveBeenCalledTimes(1)
  })

  it('should transcribe a detected speech segment without stopping the microphone', async () => {
    let onSpeechEnd: () => void = () => undefined
    const recording = createRecording()
    vi.mocked(recording.onSpeechEnd).mockImplementation((handler) => {
      onSpeechEnd = handler
      return vi.fn()
    })
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => speechSuccess(recording)),
    }
    const recognizer = createRecognizer()
    const onTranscript = vi.fn()
    const root = createSpeechRoot(createRuntime(recorder, recognizer), {
      endpointing: () => true,
      onTranscript,
    })

    await root.controller.startRecording()
    onSpeechEnd()

    await vi.waitFor(() => expect(onTranscript).toHaveBeenCalledWith('테스트 문장'))
    expect(recording.takeSegment).toHaveBeenCalledTimes(1)
    expect(recording.stop).not.toHaveBeenCalled()
    expect(root.controller.activity()).toBe('recording')

    await root.controller.stopRecording()
    expect(recording.stop).toHaveBeenCalledTimes(1)
    expect(recognizer.transcribe).toHaveBeenCalledTimes(2)
    expect(root.controller.activity()).toBe('idle')
    root.dispose()
  })

  it('should expose capture and recognition failures as stable user states', async () => {
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () =>
        speechFailure({code: 'permission-denied' as const, retryable: true}),
      ),
    }
    const recognizer = createRecognizer()
    const root = createSpeechRoot(createRuntime(recorder, recognizer))

    await root.controller.startRecording()
    expect(root.controller.activity()).toBe('idle')
    expect(root.controller.errorMessage()).toContain('마이크 권한')
    expect(recognizer.prepare).not.toHaveBeenCalled()
    root.dispose()
  })

  it('should cancel a capture that resolves after disposal', async () => {
    const startResult = createDeferred<ReturnType<typeof speechSuccess<SpeechRecording>>>()
    const recording = createRecording()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(() => startResult.promise),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))
    const start = root.controller.startRecording()

    root.dispose()
    startResult.resolve(speechSuccess(recording))
    await start

    expect(recording.cancel).toHaveBeenCalledTimes(1)
  })
})
