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

describe('useSpeechToText', () => {
  it('should prevent duplicate capture while microphone permission is pending', async () => {
    const startResult = createDeferred<ReturnType<typeof successResult<SpeechRecording>>>()
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

    startResult.resolve(successResult(recording))
    await Promise.all([firstStart, secondStart])
    expect(root.controller.activity()).toBe('recording')
    root.dispose()
    expect(recording.cancel).toHaveBeenCalledTimes(1)
  })

  it('should prepare, transcribe, append text, and release owned resources', async () => {
    const recording = createRecording()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(async () => successResult(recording)),
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
      start: vi.fn(async () => successResult(recording)),
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
        failureResult({code: 'permission-denied' as const, retryable: true}),
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
    const startResult = createDeferred<ReturnType<typeof successResult<SpeechRecording>>>()
    const recording = createRecording()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(() => startResult.promise),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))
    const start = root.controller.startRecording()

    root.dispose()
    startResult.resolve(successResult(recording))
    await start

    expect(recording.cancel).toHaveBeenCalledTimes(1)
  })

  it('should ignore a capture failure that resolves after disposal', async () => {
    const startResult = createDeferred<Awaited<ReturnType<SpeechRecorder['start']>>>()
    const recorder: SpeechRecorder = {
      isSupported: () => true,
      start: vi.fn(() => startResult.promise),
    }
    const root = createSpeechRoot(createRuntime(recorder, createRecognizer()))
    const start = root.controller.startRecording()

    root.dispose()
    startResult.resolve(failureResult({code: 'capture-failed', retryable: true}))
    await start

    expect(root.controller.errorMessage()).toBeNull()
  })
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
