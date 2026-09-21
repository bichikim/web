/** @vitest-environment node */
import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {useSoundJoining} from '../features/sound-joining/use-sound-joining'

const RATE = 44100

class TestWorker {
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
}

function createAudioBuffer(seconds = 6): AudioBuffer {
  const channel = new Float32Array(seconds * RATE)
  return {
    duration: seconds,
    getChannelData: vi.fn(() => channel),
    numberOfChannels: 2,
  } as unknown as AudioBuffer
}

function createFile(name: string): File {
  return Object.assign(new File([], name), {arrayBuffer: vi.fn(async () => new ArrayBuffer(0))})
}

function createRequest() {
  return {
    connectionSeconds: 4,
    first: createFile('first.wav'),
    prompt: 'continuous rainfall',
    second: createFile('second.wav'),
    trimEnd: 0,
    trimStart: 0,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should surface feedback when generate is called while a join is already running', async () => {
  const workers: TestWorker[] = []
  vi.stubGlobal(
    'Worker',
    class extends TestWorker {
      constructor() {
        super()
        workers.push(this)
      }
    },
  )
  vi.stubGlobal(
    'AudioContext',
    class {
      close = vi.fn(async () => {})
      decodeAudioData = vi.fn(async () => createAudioBuffer())
    },
  )

  const root = createRoot((dispose) => ({dispose, joining: useSoundJoining()}))
  void root.joining.generate(createRequest())
  await vi.waitFor(() => expect(workers).toHaveLength(1))
  expect(root.joining.busy()).toBe(true)

  root.joining.generate(createRequest())

  expect(root.joining.error()).not.toBeNull()
  root.dispose()
})
