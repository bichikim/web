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

describe('toggleRecording', () => {
  it.each([
    ['an Error', new Error('start exploded'), 'start exploded'],
    ['a non-Error', 'start exploded', '마이크 실행 오류'],
  ])('should recover when starting rejects with %s', async (_name, reason, message) => {
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn().mockRejectedValue(reason),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    root.controller.toggleRecording()
    await vi.waitFor(() => expect(root.controller.errorMessage()).toBe(message))

    expect(root.controller.activity()).toBe('idle')
    root.dispose()
  })

  it.each([
    ['an Error', new Error('stop exploded'), 'stop exploded'],
    ['a non-Error', 'stop exploded', '음성 처리 오류'],
  ])('should recover when stopping rejects with %s', async (_name, reason, message) => {
    const recording = createRecording()
    vi.mocked(recording.stop).mockRejectedValue(reason)
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))
    await root.controller.startRecording()

    root.controller.toggleRecording()
    await vi.waitFor(() => expect(root.controller.errorMessage()).toBe(message))

    expect(root.controller.activity()).toBe('idle')
    root.dispose()
  })

  it('should ignore activity changes while a start request is pending', () => {
    const startResult = createDeferred<Awaited<ReturnType<SpeechRecorder['start']>>>()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(() => startResult.promise),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    root.controller.toggleRecording()
    root.controller.toggleRecording()

    expect(root.controller.activity()).toBe('requesting')
    expect(recorder.start).toHaveBeenCalledTimes(1)
    root.dispose()
  })

  it('should ignore a start rejection after disposal', async () => {
    const startResult = createDeferred<Awaited<ReturnType<SpeechRecorder['start']>>>()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(() => startResult.promise),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))

    root.controller.toggleRecording()
    root.dispose()
    startResult.reject(new Error('late start failure'))
    await Promise.resolve()
    await Promise.resolve()

    expect(root.controller.errorMessage()).toBeNull()
  })

  it('should ignore a stop rejection after disposal', async () => {
    const stopResult = createDeferred<Awaited<ReturnType<SpeechRecording['stop']>>>()
    const recording = createRecording()
    vi.mocked(recording.stop).mockReturnValue(stopResult.promise)
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))
    await root.controller.startRecording()

    root.controller.toggleRecording()
    root.dispose()
    stopResult.reject(new Error('late stop failure'))
    await Promise.resolve()
    await Promise.resolve()

    expect(root.controller.errorMessage()).toBeNull()
  })
})
