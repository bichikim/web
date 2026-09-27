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

function installAudioContext() {
  vi.stubGlobal(
    'AudioContext',
    class {
      close = vi.fn(async () => {})
      decodeAudioData = vi.fn(async () => createAudioBuffer())
    },
  )
}

function installWorker() {
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
  return workers
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should replace the progress status with a failure message when the worker reports an error', async () => {
  const workers = installWorker()
  installAudioContext()
  const root = createRoot((dispose) => ({dispose, joining: useSoundJoining()}))

  const execution = root.joining.generate(createRequest())
  await vi.waitFor(() => expect(workers).toHaveLength(1))
  const progressLine = '인퍼런스 진행 중'
  workers[0].onmessage?.({data: {message: progressLine, type: 'progress'}} as MessageEvent)
  expect(root.joining.status()).toBe(progressLine)

  workers[0].onmessage?.({data: {message: 'GPU failed', type: 'error'}} as MessageEvent)
  await execution

  expect(root.joining.error()).toBe('GPU failed')
  expect(root.joining.status()).not.toBe(progressLine)

  root.dispose()
})
