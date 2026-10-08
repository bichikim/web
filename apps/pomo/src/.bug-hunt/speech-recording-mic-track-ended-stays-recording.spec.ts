/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {createBrowserSpeechRecorder} from '../features/speech-to-text/browser-recorder'
import {
  type SpeechRecognizer,
  type SpeechToTextRuntime,
  useSpeechToText,
} from '../features/speech-to-text'
import {successResult} from 'src/features/result'

type RecorderListener = (event: BlobEvent | Event) => void

class FakeMediaRecorder {
  static current: FakeMediaRecorder | null = null
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
    for (const listener of this.#listeners.get('dataavailable') ?? []) {
      listener({data: new Blob(['audio'])} as BlobEvent)
    }
    for (const listener of this.#listeners.get('stop') ?? []) {
      listener(new Event('stop'))
    }
  }
}

let trackEnded: (() => void) | undefined
const trackStop = vi.fn()
const stream = {
  getTracks: () => [
    {
      addEventListener: (type: string, listener: () => void) => {
        if (type === 'ended') {
          trackEnded = listener
        }
      },
      stop: trackStop,
    },
  ],
} as unknown as MediaStream

beforeEach(() => {
  trackEnded = undefined
  FakeMediaRecorder.current = null
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('navigator', {mediaDevices: {getUserMedia: vi.fn(async () => stream)}})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const createRecognizer = (): SpeechRecognizer => ({
  dispose: vi.fn(),
  prepare: vi.fn(async () => successResult({backend: 'wasm' as const})),
  transcribe: vi.fn(async () => successResult({backend: 'wasm' as const, text: ''})),
})

const runtime: SpeechToTextRuntime = {
  createRecognizer: () => createRecognizer(),
  createRecorder: createBrowserSpeechRecorder,
  getPreferredBackend: () => 'wasm',
}

it('should leave recording activity when the microphone track ends mid-capture', async () => {
  let dispose = () => undefined
  const controller = createRoot((disposeRoot) => {
    dispose = disposeRoot
    return useSpeechToText({runtime})
  })

  await controller.startRecording()
  expect(controller.activity()).toBe('recording')

  trackEnded?.()
  await Promise.resolve()
  await Promise.resolve()

  expect(controller.activity()).toBe('idle')
  expect(controller.errorMessage()).not.toBeNull()

  dispose()
})
