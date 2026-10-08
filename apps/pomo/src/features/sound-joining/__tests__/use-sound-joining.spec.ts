import {createSoundWorker} from 'src/features/sound-generation/create-sound-worker'
vi.mock('src/features/sound-generation/create-sound-worker', () => ({createSoundWorker: vi.fn()}))
import {createDeferred} from 'src/test-utils/create-deferred'
/** @vitest-environment node */
import {createRoot} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {assembleJoin} from '../audio'
import {useSoundJoining} from '../use-sound-joining'

vi.mock('../audio', async (importOriginal) => {
  const original = await importOriginal<typeof import('../audio')>()
  return {...original, assembleJoin: vi.fn()}
})

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

function createAudioBuffer(seconds = 6, duration = seconds): AudioBuffer {
  const channel = new Float32Array(seconds * RATE)
  return {
    duration,
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
  const constructed = vi.fn()
  const close = vi.fn(async () => {})
  const decodeAudioData = vi.fn(async () => {
    const buffer = buffers[index]
    index += 1
    return buffer
  })
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        constructed()
      }

      close = close
      decodeAudioData = decodeAudioData
    },
  )
  return {close, constructed, decodeAudioData}
}

function installWorker() {
  const workers: TestWorker[] = []
  vi.mocked(createSoundWorker).mockImplementation(() => {
    const worker = new TestWorker()
    workers.push(worker)
    return worker
  })
  return workers
}

beforeEach(() => {
  vi.mocked(assembleJoin).mockReturnValue(createBlob())
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it.each(['trimEnd', 'trimStart'] as const)(
  'should reject a non-finite %s value before reading either source file',
  async (trim) => {
    const workers = installWorker()
    const audio = installAudioContext([createAudioBuffer(), createAudioBuffer()])
    const request = createRequest()
    const root = createRoot((dispose) => ({dispose, joining: useSoundJoining()}))

    await root.joining.generate({...request, [trim]: Number.NaN})

    expect(request.first.arrayBuffer).not.toHaveBeenCalled()
    expect(request.second.arrayBuffer).not.toHaveBeenCalled()
    expect(audio.constructed).not.toHaveBeenCalled()
    expect(audio.decodeAudioData).not.toHaveBeenCalled()
    expect(workers).toHaveLength(0)
    expect(root.joining.error()).toBe('잘라낼 시간은 0 이상, 연결 구간은 1~10초로 지정해 주세요.')
    root.dispose()
  },
)

it('should reject source files longer than ten minutes before starting a worker', async () => {
  const workers = installWorker()
  const root = createRoot((dispose) => ({dispose, joining: useSoundJoining()}))
  installAudioContext([createAudioBuffer(6, 601), createAudioBuffer()])

  await root.joining.generate(createRequest())

  expect(workers).toHaveLength(0)
  expect(root.joining.error()).toBe('파일은 각각 10분 이하로 선택해 주세요.')
  root.dispose()
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

it('should report when a second generation request arrives while busy', async () => {
  const workers = installWorker()
  installAudioContext([createAudioBuffer(), createAudioBuffer(), createAudioBuffer(12)])
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:joined')
  const root = createRoot((dispose) => ({dispose, joining: useSoundJoining()}))

  const execution = root.joining.generate(createRequest())
  await vi.waitFor(() => expect(workers).toHaveLength(1))

  await root.joining.generate(createRequest())

  expect(workers).toHaveLength(1)
  expect(root.joining.busy()).toBe(true)
  expect(root.joining.error()).toBe(
    '이미 연결 생성 중인 작업이 있습니다. 완료 후 다시 시도해 주세요.',
  )
  expect(root.joining.status()).toBe('연결 생성이 진행 중입니다. 완료 후 다시 시도해 주세요.')

  workers[0].onmessage?.({data: {blob: createBlob(), type: 'result'}} as MessageEvent)
  await execution

  expect(root.joining.busy()).toBe(false)
  expect(root.joining.error()).toBeNull()
  expect(root.joining.status()).toBe('연결 완료 · 12.0초')
  root.dispose()
})

it('should clear busy feedback when generation is stopped', async () => {
  const workers = installWorker()
  installAudioContext([createAudioBuffer(), createAudioBuffer()])
  const root = createRoot((dispose) => ({dispose, joining: useSoundJoining()}))

  const execution = root.joining.generate(createRequest())
  await vi.waitFor(() => expect(workers).toHaveLength(1))
  await root.joining.generate(createRequest())

  root.joining.stop()
  await execution

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

it('should replace worker progress status when the worker reports an error', async () => {
  const workers = installWorker()
  installAudioContext([createAudioBuffer(), createAudioBuffer()])
  const root = createRoot((dispose) => ({dispose, joining: useSoundJoining()}))

  const execution = root.joining.generate(createRequest())
  await vi.waitFor(() => expect(workers).toHaveLength(1))
  workers[0].onmessage?.({
    data: {message: '인퍼런스 진행 중 · 1/8', type: 'progress'},
  } as MessageEvent)
  workers[0].onmessage?.({data: {message: 'WebGPU is unavailable', type: 'error'}} as MessageEvent)
  await execution

  expect(workers[0].terminate).toHaveBeenCalledOnce()
  expect(root.joining.busy()).toBe(false)
  expect(root.joining.error()).toBe('WebGPU is unavailable')
  expect(root.joining.status()).toBe('연결 생성에 실패했습니다. 다시 시도할 수 있습니다.')
  root.dispose()
})

it('should revoke the previous joined URL when a later result replaces it', async () => {
  const firstJoined = createBlob()
  const secondJoined = createBlob()
  vi.mocked(assembleJoin).mockReturnValueOnce(firstJoined).mockReturnValueOnce(secondJoined)
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

  expect(URL.createObjectURL).toHaveBeenNthCalledWith(1, firstJoined)
  expect(URL.createObjectURL).toHaveBeenNthCalledWith(2, secondJoined)
  expect(root.joining.url()).toBe('blob:second')
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first')
  root.dispose()

  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:second')
})

it('should clear the previous joined URL when a later worker request fails', async () => {
  const workers = installWorker()
  installAudioContext([
    createAudioBuffer(),
    createAudioBuffer(),
    createAudioBuffer(12),
    createAudioBuffer(),
    createAudioBuffer(),
  ])
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:first')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const root = createRoot((dispose) => ({dispose, joining: useSoundJoining()}))

  const firstExecution = root.joining.generate(createRequest())
  await vi.waitFor(() => expect(workers).toHaveLength(1))
  workers[0].onmessage?.({data: {blob: createBlob(), type: 'result'}} as MessageEvent)
  await firstExecution
  expect(root.joining.url()).toBe('blob:first')

  const failedExecution = root.joining.generate(createRequest())
  await vi.waitFor(() => expect(workers).toHaveLength(2))
  workers[1].onmessage?.({data: {message: 'worker failed', type: 'error'}} as MessageEvent)
  await failedExecution

  expect(root.joining.error()).toBe('worker failed')
  expect(root.joining.url()).toBeNull()
  expect(URL.createObjectURL).toHaveBeenCalledOnce()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first')
  root.dispose()
})
