/** @vitest-environment jsdom */
import {cleanup, render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {failureResult, successResult} from 'src/features/result'
import {createBrowserSpeechRecorder} from '../browser-recorder'
import {
  type SpeechRecognizer,
  type SpeechToTextController,
  type SpeechToTextRuntime,
  useSpeechToText,
} from '../index'
import type {SpeechEndDetector} from '../speech-end-detector'
import type {Accessor} from 'solid-js'

type RecorderListener = (event: BlobEvent | Event) => void
type TrackListener = (event: Event) => void

class FakeMediaRecorder {
  static current: FakeMediaRecorder | null = null
  static autoStop = true

  readonly mimeType = 'audio/webm'
  readonly #listeners = new Map<string, Array<RecorderListener>>()
  state: RecordingState = 'inactive'

  constructor() {
    FakeMediaRecorder.current = this
  }

  addEventListener(type: string, listener: RecorderListener) {
    const listeners = this.#listeners.get(type) ?? []
    listeners.push(listener)
    this.#listeners.set(type, listeners)
  }

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    if (FakeMediaRecorder.autoStop) {
      this.emitStop()
    }
  }

  emitStop() {
    this.state = 'inactive'
    for (const listener of this.#listeners.get('dataavailable') ?? []) {
      listener({data: new Blob(['audio'])} as BlobEvent)
    }
    for (const listener of this.#listeners.get('stop') ?? []) {
      listener(new Event('stop'))
    }
  }

  emitError() {
    this.state = 'inactive'
    for (const listener of this.#listeners.get('error') ?? []) {
      listener(new Event('error'))
    }
    this.emitStop()
  }
}

class FakeMediaStreamTrack {
  readonly #listeners = new Map<string, Array<TrackListener>>()
  readonly stop = vi.fn(() => {
    this.readyState = 'ended'
  })
  readyState: MediaStreamTrackState = 'live'

  addEventListener(type: string, listener: TrackListener) {
    const listeners = this.#listeners.get(type) ?? []
    listeners.push(listener)
    this.#listeners.set(type, listeners)
  }

  removeEventListener(type: string, listener: TrackListener) {
    const listeners = this.#listeners.get(type) ?? []
    this.#listeners.set(
      type,
      listeners.filter((candidate) => candidate !== listener),
    )
  }

  emitEnded() {
    this.readyState = 'ended'
    this.emit('ended')
  }

  emit(type: string) {
    for (const listener of this.#listeners.get(type) ?? []) {
      listener(new Event(type))
    }
  }
}

let activeTrack: FakeMediaStreamTrack
const decodeRecording = vi.fn(async () => new Float32Array(4_000).fill(0.1))

interface SpeechInterruptionTestOptions {
  readonly createSpeechEndDetector?: (stream: MediaStream) => SpeechEndDetector | null
  readonly endpointing?: Accessor<boolean>
  readonly onTranscript?: (text: string) => void
  readonly transcribe?: SpeechRecognizer['transcribe']
}

const mountSpeechToText = async (options: SpeechInterruptionTestOptions = {}) => {
  const onTranscript = options.onTranscript ?? vi.fn()
  const transcribe =
    options.transcribe ??
    vi.fn(async () => successResult({backend: 'wasm' as const, text: '부분 전사'}))
  const runtime: SpeechToTextRuntime = {
    createRecognizer: () => ({
      dispose: vi.fn(),
      prepare: vi.fn(async () => successResult({backend: 'wasm' as const})),
      transcribe,
    }),
    createRecorder: () =>
      createBrowserSpeechRecorder({
        createSpeechEndDetector: options.createSpeechEndDetector,
        decodeRecording,
      }),
    getPreferredBackend: () => 'wasm',
  }
  const controllerReference: {current: SpeechToTextController | null} = {current: null}
  const view = render(() => {
    controllerReference.current = useSpeechToText({
      endpointing: options.endpointing,
      onTranscript,
      runtime,
    })
    return null
  })

  const controller = controllerReference.current
  if (controller === null) {
    throw new Error('음성 입력 훅이 마운트되지 않았습니다.')
  }

  await waitFor(() => expect(controller.activity()).toBe('idle'))
  return {controller, onTranscript, transcribe, unmount: view.unmount}
}

beforeEach(() => {
  activeTrack = new FakeMediaStreamTrack()
  FakeMediaRecorder.current = null
  FakeMediaRecorder.autoStop = true
  decodeRecording.mockClear()
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: vi.fn(async () => {
        activeTrack = new FakeMediaStreamTrack()
        return {getTracks: () => [activeTrack]} as unknown as MediaStream
      }),
    },
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('speech recording interruptions', () => {
  it('should transcribe partial audio before reporting interruption and allow restarting', async () => {
    const transcription =
      Promise.withResolvers<Awaited<ReturnType<SpeechRecognizer['transcribe']>>>()
    const transcribe = vi.fn(() => transcription.promise)
    const onTranscript = vi.fn()
    const {controller, unmount} = await mountSpeechToText({onTranscript, transcribe})

    await controller.startRecording()
    expect(controller.activity()).toBe('recording')

    activeTrack.emitEnded()
    expect(controller.activity()).toBe('processing')
    const mediaRecorder = FakeMediaRecorder.current
    mediaRecorder?.emitStop()

    await waitFor(() => expect(transcribe).toHaveBeenCalledOnce())
    expect(controller.activity()).toBe('processing')
    expect(controller.errorMessage()).toBeNull()

    transcription.resolve(successResult({backend: 'wasm', text: '부분 전사'}))
    await waitFor(() => expect(controller.activity()).toBe('idle'))

    expect(controller.text()).toBe('부분 전사')
    expect(onTranscript).toHaveBeenCalledWith('부분 전사')
    expect(controller.errorMessage()).toContain('중단')

    await controller.startRecording()
    expect(controller.activity()).toBe('recording')
    expect(controller.errorMessage()).toBeNull()
    await controller.stopRecording()
    expect(controller.activity()).toBe('idle')
    unmount()
  })

  it('should report one interruption when the browser recorder errors and then stops', async () => {
    const {controller, transcribe, unmount} = await mountSpeechToText()

    await controller.startRecording()
    FakeMediaRecorder.current?.emitError()

    await waitFor(() => expect(controller.activity()).toBe('idle'))
    expect(controller.text()).toBe('부분 전사')
    expect(transcribe).toHaveBeenCalledOnce()
    expect(decodeRecording).toHaveBeenCalledOnce()
    expect(controller.errorMessage()).toContain('중단')
    unmount()
  })

  it('should report an unexpected browser recorder stop', async () => {
    const {controller, unmount} = await mountSpeechToText()

    await controller.startRecording()
    FakeMediaRecorder.current?.emitStop()

    await waitFor(() => expect(controller.activity()).toBe('idle'))
    expect(controller.text()).toBe('부분 전사')
    expect(controller.errorMessage()).toContain('중단')
    unmount()
  })

  it('should finish a pending endpoint segment before reporting track interruption', async () => {
    let onSpeechEnd: () => void = () => undefined
    const disposeDetector = vi.fn()
    const {controller, transcribe, unmount} = await mountSpeechToText({
      createSpeechEndDetector: () => ({
        dispose: disposeDetector,
        subscribe: (handler) => {
          onSpeechEnd = handler
          return vi.fn()
        },
      }),
      endpointing: () => true,
    })

    await controller.startRecording()
    FakeMediaRecorder.autoStop = false
    onSpeechEnd()
    const segmentRecorder = FakeMediaRecorder.current
    expect(segmentRecorder).not.toBeNull()

    activeTrack.emitEnded()
    expect(controller.activity()).toBe('processing')
    segmentRecorder?.emitStop()

    await waitFor(() => expect(controller.activity()).toBe('idle'))
    expect(transcribe).toHaveBeenCalledOnce()
    expect(controller.text()).toBe('부분 전사')
    expect(controller.errorMessage()).toContain('중단')
    expect(disposeDetector).toHaveBeenCalledOnce()
    unmount()
  })

  it('should report a recorder error after endpointing rotates to a new segment', async () => {
    let onSpeechEnd: () => void = () => undefined
    const {controller, transcribe, unmount} = await mountSpeechToText({
      createSpeechEndDetector: () => ({
        dispose: vi.fn(),
        subscribe: (handler) => {
          onSpeechEnd = handler
          return vi.fn()
        },
      }),
      endpointing: () => true,
    })

    await controller.startRecording()
    onSpeechEnd()
    await waitFor(() => expect(transcribe).toHaveBeenCalledOnce())

    FakeMediaRecorder.current?.emitError()
    await waitFor(() => expect(controller.activity()).toBe('idle'))

    expect(transcribe).toHaveBeenCalledTimes(2)
    expect(controller.errorMessage()).toContain('중단')
    unmount()
  })

  it('should ignore interrupted audio that finishes after controller disposal', async () => {
    const transcription =
      Promise.withResolvers<Awaited<ReturnType<SpeechRecognizer['transcribe']>>>()
    const transcribe = vi.fn(() => transcription.promise)
    const onTranscript = vi.fn()
    const {controller, unmount} = await mountSpeechToText({onTranscript, transcribe})

    await controller.startRecording()
    activeTrack.emitEnded()
    FakeMediaRecorder.current?.emitStop()
    await waitFor(() => expect(transcribe).toHaveBeenCalledOnce())
    unmount()

    transcription.resolve(successResult({backend: 'wasm', text: '늦은 전사'}))
    await Promise.resolve()
    await Promise.resolve()

    expect(controller.text()).toBe('')
    expect(onTranscript).not.toHaveBeenCalled()
  })

  it('should keep recording activity through a temporary track mute', async () => {
    const {controller, unmount} = await mountSpeechToText()

    await controller.startRecording()
    activeTrack.emit('mute')
    expect(controller.activity()).toBe('recording')

    activeTrack.emit('unmute')
    expect(controller.activity()).toBe('recording')
    expect(controller.errorMessage()).toBeNull()
    unmount()
  })

  it('should keep the existing transcription error when an interrupted partial capture fails', async () => {
    const transcriptionFailure = failureResult({
      code: 'transcription-failed' as const,
      detail: 'recognition failed',
      phase: 'transcribe' as const,
      retryable: true,
    })
    const transcribe = vi.fn(async () => transcriptionFailure)
    const {controller, onTranscript, unmount} = await mountSpeechToText({transcribe})

    await controller.startRecording()
    activeTrack.emitEnded()
    FakeMediaRecorder.current?.emitStop()

    await waitFor(() => expect(controller.activity()).toBe('idle'))

    expect(controller.errorMessage()).toContain('글로 바꾸지 못했어요')
    expect(onTranscript).not.toHaveBeenCalled()
    unmount()
  })
})
