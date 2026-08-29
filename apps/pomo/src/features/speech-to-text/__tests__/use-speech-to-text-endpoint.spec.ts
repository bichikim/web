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

describe('endpoint lifecycle', () => {
  it('should expose a segment capture failure and cancel recording', async () => {
    let onSpeechEnd: () => void = () => undefined
    const recording = createRecording()
    vi.mocked(recording.onSpeechEnd).mockImplementation((handler) => {
      onSpeechEnd = handler
      return vi.fn()
    })
    vi.mocked(recording.takeSegment).mockResolvedValue(
      failureResult({code: 'capture-failed', detail: 'segment failed', retryable: true}),
    )
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()), {
      endpointing: () => true,
    })
    await root.controller.startRecording()

    onSpeechEnd()
    await vi.waitFor(() => expect(root.controller.errorMessage()).toBe('segment failed'))

    expect(root.controller.activity()).toBe('idle')
    expect(recording.cancel).toHaveBeenCalledTimes(1)
    root.dispose()
  })

  it.each([
    ['an Error', new Error('segment exploded'), 'segment exploded'],
    ['a non-Error', 'segment exploded', '음성 처리 오류'],
  ])('should expose an unexpected segment error from %s', async (_name, reason, message) => {
    let onSpeechEnd: () => void = () => undefined
    const recording = createRecording()
    vi.mocked(recording.onSpeechEnd).mockImplementation((handler) => {
      onSpeechEnd = handler
      return vi.fn()
    })
    vi.mocked(recording.takeSegment).mockRejectedValue(reason)
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()), {
      endpointing: () => true,
    })
    await root.controller.startRecording()

    onSpeechEnd()
    await vi.waitFor(() => expect(root.controller.errorMessage()).toBe(message))

    expect(root.controller.activity()).toBe('recording')
    root.dispose()
  })

  it('should ignore too-short endpoint segments', async () => {
    let onSpeechEnd: () => void = () => undefined
    const recording = createRecording()
    vi.mocked(recording.onSpeechEnd).mockImplementation((handler) => {
      onSpeechEnd = handler
      return vi.fn()
    })
    vi.mocked(recording.takeSegment).mockResolvedValue(successResult(new Float32Array(3999)))
    const recognizer = createRecognizer()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, recognizer), {
      endpointing: () => true,
    })
    await root.controller.startRecording()

    onSpeechEnd()
    await vi.waitFor(() => expect(recording.takeSegment).toHaveBeenCalled())
    await root.controller.stopRecording()

    expect(recognizer.transcribe).toHaveBeenCalledTimes(1)
    root.dispose()
  })

  it('should ignore an unexpected segment error after disposal', async () => {
    let onSpeechEnd: () => void = () => undefined
    const segment = createDeferred<Awaited<ReturnType<SpeechRecording['takeSegment']>>>()
    const recording = createRecording()
    vi.mocked(recording.onSpeechEnd).mockImplementation((handler) => {
      onSpeechEnd = handler
      return vi.fn()
    })
    vi.mocked(recording.takeSegment).mockReturnValue(segment.promise)
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()), {
      endpointing: () => true,
    })
    await root.controller.startRecording()

    onSpeechEnd()
    root.dispose()
    segment.reject(new Error('late segment failure'))
    await Promise.resolve()
    await Promise.resolve()

    expect(root.controller.errorMessage()).toBeNull()
  })
})

describe('runtime support', () => {
  it('should expose an unsupported recorder', () => {
    const recorder: SpeechRecorder = {isSupported: () => false, start: vi.fn()}
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    expect(root.controller.isSupported()).toBe(false)
    expect(root.controller.errorMessage()).toContain('지원하지 않아요')
    root.dispose()
  })

  it.each([
    ['wasm when navigator is unavailable', undefined, 'wasm'],
    ['wasm when WebGPU is unavailable', {}, 'wasm'],
    ['webgpu when navigator exposes a GPU', {gpu: {}}, 'webgpu'],
  ] as const)('should use default runtime with %s', (_name, navigatorValue, backend) => {
    vi.stubGlobal('navigator', navigatorValue)
    const recorder: SpeechRecorder = {isSupported: () => true, start: vi.fn()}
    dependencyMocks.createBrowserSpeechRecorder.mockReturnValue(recorder)
    dependencyMocks.createSpeechRecognizer.mockReturnValue(createRecognizer())

    const root = createDefaultSpeechRoot()

    expect(root.controller.backend()).toBe(backend)
    expect(root.controller.isSupported()).toBe(true)
    root.dispose()
  })
})
