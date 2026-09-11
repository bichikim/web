/** @vitest-environment node */
import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useSoundJoining} from '../use-sound-joining'

const RATE = 44100

interface Deferred<Value> {
  readonly promise: Promise<Value>
  readonly resolve: (value: Value) => void
}

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
    first: createFile('first.wav'),
    prompt: 'continuous rainfall',
    second: createFile('second.wav'),
    transition: 4,
    trimEnd: 0,
    trimStart: 0,
  }
}

function createDeferred<Value>(): Deferred<Value> {
  let resolvePromise: (value: Value) => void = () => undefined
  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve
  })
  return {promise, resolve: resolvePromise}
}

function installAudioContext(buffers: readonly (AudioBuffer | Promise<AudioBuffer>)[]) {
  let index = 0
  const close = vi.fn(async () => {})
  const decodeAudioData = vi.fn(async () => {
    const buffer = buffers[index]
    index += 1
    return buffer
  })
  vi.stubGlobal(
    'AudioContext',
    class {
      close = close
      decodeAudioData = decodeAudioData
    },
  )
  return {close, decodeAudioData}
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

it('should ignore a worker result delivered after cancellation', async () => {
  const workers = installWorker()
  installAudioContext([createAudioBuffer(), createAudioBuffer()])
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:joined')
  const root = createRoot((dispose) => ({dispose, joining: useSoundJoining()}))

  const execution = root.joining.generate(createRequest())
  await vi.waitFor(() => expect(workers).toHaveLength(1))
  root.joining.stop()
  workers[0].onmessage?.({data: {blob: createBlob(), type: 'result'}} as MessageEvent)
  await execution

  expect(workers[0].terminate).toHaveBeenCalledOnce()
  expect(root.joining.busy()).toBe(false)
  expect(root.joining.error()).toBeNull()
  expect(root.joining.status()).toBe('연결 생성을 중지했습니다.')
  expect(root.joining.url()).toBeNull()
  expect(URL.createObjectURL).not.toHaveBeenCalled()
  root.dispose()
})

it('should not start a worker when selection is cancelled while audio decoding is pending', async () => {
  const first = createDeferred<AudioBuffer>()
  const second = createDeferred<AudioBuffer>()
  const workers = installWorker()
  const audio = installAudioContext([first.promise, second.promise])
  const root = createRoot((dispose) => ({dispose, joining: useSoundJoining()}))

  const execution = root.joining.generate(createRequest())
  await vi.waitFor(() => expect(audio.decodeAudioData).toHaveBeenCalledTimes(2))
  root.joining.stop()
  first.resolve(createAudioBuffer())
  second.resolve(createAudioBuffer())
  await execution

  expect(workers).toHaveLength(0)
  expect(root.joining.busy()).toBe(false)
  expect(root.joining.error()).toBeNull()
  expect(root.joining.status()).toBe('연결 생성을 중지했습니다.')
  root.dispose()
})

it('should clear busy state when audio decoding fails before worker creation', async () => {
  const workers = installWorker()
  installAudioContext([Promise.reject(new Error('decode failed')), createAudioBuffer()])
  const root = createRoot((dispose) => ({dispose, joining: useSoundJoining()}))

  await root.joining.generate(createRequest())

  expect(workers).toHaveLength(0)
  expect(root.joining.busy()).toBe(false)
  expect(root.joining.error()).toBe('decode failed')
  root.dispose()
})

it('should clear busy state when the worker reports an execution failure', async () => {
  const workers = installWorker()
  installAudioContext([createAudioBuffer(), createAudioBuffer()])
  const root = createRoot((dispose) => ({dispose, joining: useSoundJoining()}))

  const execution = root.joining.generate(createRequest())
  await vi.waitFor(() => expect(workers).toHaveLength(1))
  workers[0].onerror?.({message: 'worker failed'} as ErrorEvent)
  await execution

  expect(workers[0].terminate).toHaveBeenCalledOnce()
  expect(root.joining.busy()).toBe(false)
  expect(root.joining.error()).toBe('worker failed')
  root.dispose()
})

it('should revoke the previous joined URL when a later result replaces it', async () => {
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
    .mockReturnValueOnce('blob:first')
    .mockReturnValueOnce('blob:second')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const root = createRoot((dispose) => ({dispose, joining: useSoundJoining()}))
  const execution = root.joining.generate(createRequest())
  await vi.waitFor(() => expect(workers).toHaveLength(1))
  workers[0].onmessage?.({data: {blob: createBlob(), type: 'result'}} as MessageEvent)
  await execution

  const replacement = root.joining.generate(createRequest())
  await vi.waitFor(() => expect(workers).toHaveLength(2))
  workers[1].onmessage?.({data: {blob: createBlob(), type: 'result'}} as MessageEvent)
  await replacement

  expect(root.joining.url()).toBe('blob:second')
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first')
  root.dispose()

  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:second')
})
