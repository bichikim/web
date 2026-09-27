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

function createBlob(): Blob {
  return Object.assign(new Blob(), {arrayBuffer: vi.fn(async () => new ArrayBuffer(0))})
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

function installAudioContext(buffers: readonly (AudioBuffer | Promise<AudioBuffer>)[]) {
  let index = 0
  vi.stubGlobal(
    'AudioContext',
    class {
      close = vi.fn(async () => {})
      decodeAudioData = vi.fn(async () => {
        const buffer = buffers[index]
        index += 1
        return buffer
      })
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

it('should clear the previous joined URL when a later worker execution fails', async () => {
  const workers = installWorker()
  installAudioContext([
    createAudioBuffer(),
    createAudioBuffer(),
    createAudioBuffer(12),
    createAudioBuffer(),
    createAudioBuffer(),
    createAudioBuffer(12),
  ])
  vi.spyOn(URL, 'createObjectURL')
    .mockReturnValueOnce('blob:first-join')
    .mockReturnValueOnce('blob:second-join')
  const root = createRoot((dispose) => ({dispose, joining: useSoundJoining()}))

  const firstRun = root.joining.generate(createRequest())
  await vi.waitFor(() => expect(workers).toHaveLength(1))
  workers[0].onmessage?.({data: {blob: createBlob(), type: 'result'}} as MessageEvent)
  await firstRun
  expect(root.joining.url()).toBe('blob:first-join')

  const secondRun = root.joining.generate(createRequest())
  await vi.waitFor(() => expect(workers).toHaveLength(2))
  workers[1].onmessage?.({data: {message: 'GPU failed', type: 'error'}} as MessageEvent)
  await secondRun

  expect(root.joining.error()).toBe('GPU failed')
  expect(root.joining.url()).toBeNull()

  root.dispose()
})
