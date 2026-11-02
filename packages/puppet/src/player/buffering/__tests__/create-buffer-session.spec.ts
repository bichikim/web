import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import {createBufferEngine} from '../create-buffer-engine'
import {createBufferWorker} from '../create-buffer-worker'
import {createBufferSession} from '../create-buffer-session'
import type {BufferFrame, BufferWorker} from '../types'

vi.mock('../create-buffer-worker', () => ({createBufferWorker: vi.fn()}))
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

test('should present the pending initial frame when playback stops before its response', async () => {
  const document = createEmptyDocument()
  const engine = createBufferEngine(document)
  const state = engine.step(0, new ArrayBuffer(0)).state
  let finish: (frame: BufferFrame) => void = () => {}
  const pending = new Promise<BufferFrame>((resolve) => {
    finish = resolve
  })
  const worker: BufferWorker = {
    destroy: vi.fn(),
    initialize: vi.fn().mockResolvedValue(0),
    produce: vi.fn().mockReturnValue(pending),
    reset: vi.fn().mockResolvedValue(undefined),
    updateAudio: vi.fn().mockResolvedValue(undefined),
  }
  vi.mocked(createBufferWorker).mockReturnValue(worker)
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  let running = true
  const onFrame = vi.fn()
  const session = createBufferSession({document, onError: vi.fn(), onFrame, running: () => running})
  await session.ready
  await session.start(state)
  running = false
  const request = vi.mocked(worker.produce).mock.calls[0]![0]
  finish({
    ...engine.step(0, request.buffer),
    deltaTime: 0,
    generation: request.generation,
    kind: 'frame',
    time: request.time,
  })
  await Promise.resolve()
  await Promise.resolve()
  expect(onFrame).toHaveBeenCalledOnce()
  session.destroy()
})

test('should recycle valid empty geometry buffers across more than nine displayed frames', async () => {
  const document = createEmptyDocument()
  const engine = createBufferEngine(document)
  const state = engine.step(0, new ArrayBuffer(0)).state
  const worker: BufferWorker = {
    destroy: vi.fn(),
    initialize: vi.fn().mockResolvedValue(0),
    produce: vi.fn(async (request) => ({
      ...engine.step(request.deltaTime, request.buffer),
      deltaTime: request.deltaTime,
      generation: request.generation,
      kind: 'frame' as const,
      time: request.time,
    })),
    reset: vi.fn().mockResolvedValue(undefined),
    updateAudio: vi.fn().mockResolvedValue(undefined),
  }
  vi.mocked(createBufferWorker).mockReturnValue(worker)
  let now = 0
  let callback: FrameRequestCallback | undefined
  vi.spyOn(Date, 'now').mockImplementation(() => now)
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((next: FrameRequestCallback) => {
      callback = next
      return 1
    }),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const onFrame = vi.fn<(frame: BufferFrame) => void>()
  const session = createBufferSession({document, onError: vi.fn(), onFrame})
  await session.ready
  await session.start(state)
  for (let index = 0; index < 32; index += 1) {
    // eslint-disable-next-line no-await-in-loop -- Each simulated refresh consumes the previous Worker response.
    await Promise.resolve()
    now += 25
    callback?.(now)
  }
  expect(onFrame.mock.calls.length).toBeGreaterThan(12)
  session.destroy()
})

test('should retain the presentation clock without refilling three frames after input', async () => {
  const document = createEmptyDocument()
  const engine = createBufferEngine(document)
  const state = engine.step(0, new ArrayBuffer(0)).state
  const worker: BufferWorker = {
    destroy: vi.fn(),
    initialize: vi.fn().mockResolvedValue(0),
    produce: vi.fn(async (request) => ({
      ...engine.step(request.deltaTime, request.buffer),
      deltaTime: request.deltaTime,
      generation: request.generation,
      kind: 'frame' as const,
      time: request.time,
    })),
    reset: vi.fn().mockResolvedValue(undefined),
    updateAudio: vi.fn().mockResolvedValue(undefined),
  }
  vi.mocked(createBufferWorker).mockReturnValue(worker)
  let now = 0
  let callback: FrameRequestCallback | undefined
  vi.spyOn(Date, 'now').mockImplementation(() => now)
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((next: FrameRequestCallback) => {
      callback = next
      return 1
    }),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const onFrame = vi.fn()
  const session = createBufferSession({document, onError: vi.fn(), onFrame})
  await session.ready
  await session.start(state)
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  now = 75
  callback?.(now)
  now = 100
  callback?.(now)
  expect(onFrame).toHaveBeenCalledOnce()
  session.invalidate()
  await session.start(state)
  await Promise.resolve()
  now = 125
  callback?.(now)
  expect(onFrame).toHaveBeenCalledTimes(2)
  session.destroy()
})

test('should display an in-flight input result even when newer inputs keep arriving', async () => {
  const engine = createBufferEngine(createEmptyDocument())
  const state = engine.step(0, new ArrayBuffer(0)).state
  let input: import('../types').BufferedInput | undefined
  const requests: Array<{
    request: import('../types').ProduceBufferFrame
    resolve: (frame: BufferFrame) => void
  }> = []
  vi.mocked(createBufferWorker).mockReturnValue({
    destroy: vi.fn(),
    initialize: vi.fn().mockResolvedValue(0),
    produce: (request) =>
      new Promise((resolve) => {
        requests.push({request, resolve})
      }),
    reset: vi.fn().mockResolvedValue(undefined),
    updateAudio: vi.fn().mockResolvedValue(undefined),
  })
  let refresh: FrameRequestCallback | undefined
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback) => {
      refresh = callback
      return 1
    }),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const onFrame = vi.fn((frame) => {
    if (input?.revision === frame.inputRevision) {
      input = undefined
    }
  })
  const session = createBufferSession({
    document: createEmptyDocument(),
    input: () => input,
    onError: vi.fn(),
    onFrame,
  })
  const finish = async (index: number) => {
    const {request, resolve} = requests[index]!
    resolve({
      ...engine.step(request.deltaTime, request.buffer, request.input),
      deltaTime: request.deltaTime,
      generation: request.generation,
      kind: 'frame' as const,
      time: request.time,
    })
    await Promise.resolve()
    await Promise.resolve()
  }
  await session.ready
  await session.start(state)
  input = {revision: 1, settle: false, state}
  session.refresh()
  await finish(0)
  expect(onFrame.mock.calls[0]![0].inputRevision).toBe(0)
  expect(requests[1]!.request.input?.revision).toBe(1)
  input = {revision: 2, settle: false, state}
  session.refresh()
  await finish(1)
  expect(onFrame.mock.calls[1]![0].inputRevision).toBe(1)
  expect(requests[2]!.request.input?.revision).toBe(2)
  session.destroy()
})

test('should compute a paused input once without a three-frame refill or ongoing refresh loop', async () => {
  const document = createEmptyDocument()
  const engine = createBufferEngine(document)
  const state = engine.step(0, new ArrayBuffer(0)).state
  let input: import('../types').BufferedInput | undefined
  const worker: BufferWorker = {
    destroy: vi.fn(),
    initialize: vi.fn().mockResolvedValue(0),
    produce: vi.fn(async (request) => ({
      ...engine.step(request.deltaTime, request.buffer, request.input),
      deltaTime: request.deltaTime,
      generation: request.generation,
      kind: 'frame' as const,
      time: request.time,
    })),
    reset: vi.fn().mockResolvedValue(undefined),
    updateAudio: vi.fn().mockResolvedValue(undefined),
  }
  vi.mocked(createBufferWorker).mockReturnValue(worker)
  let refresh: FrameRequestCallback | undefined
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback) => {
      refresh = callback
      return 1
    }),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const onFrame = vi.fn(() => {
    input = undefined
  })
  const session = createBufferSession({
    document,
    input: () => input,
    onError: vi.fn(),
    onFrame,
    running: () => false,
  })
  await session.ready
  await session.start(state)
  await Promise.resolve()
  await Promise.resolve()
  input = {revision: 1, settle: true, state}
  session.refresh()
  await Promise.resolve()
  await Promise.resolve()
  expect(onFrame).toHaveBeenCalledTimes(2)
  expect(worker.produce).toHaveBeenCalledTimes(2)
  expect(requestAnimationFrame).not.toHaveBeenCalled()
  expect(vi.mocked(worker.produce).mock.calls[1]![0].deltaTime).toBe(0)
  session.destroy()
})

test('should report host callback exceptions outside the Worker failure path and release the frame', async () => {
  const document = createEmptyDocument()
  const engine = createBufferEngine(document)
  const state = engine.step(0, new ArrayBuffer(0)).state
  const callbacks: Array<() => void> = []
  vi.stubGlobal('queueMicrotask', (callback: () => void) => {
    callbacks.push(callback)
  })
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const produce = vi.fn(async (request: import('../types').ProduceBufferFrame) => ({
    ...engine.step(request.deltaTime, request.buffer, request.input, request.acknowledgedNotices),
    deltaTime: request.deltaTime,
    generation: request.generation,
    kind: 'frame' as const,
    time: request.time,
  }))
  vi.mocked(createBufferWorker).mockReturnValue({
    destroy: vi.fn(),
    initialize: vi.fn().mockResolvedValue(0),
    produce,
    reset: vi.fn().mockResolvedValue(undefined),
    updateAudio: vi.fn().mockResolvedValue(undefined),
  })
  const failure = new Error('Consumer callback failed')
  const onError = vi.fn()
  const session = createBufferSession({
    document,
    input: () => ({revision: 1, settle: false, state}),
    onError,
    onFrame: () => {
      throw failure
    },
    running: () => false,
  })
  await session.ready
  await session.start(state)
  await Promise.resolve()
  await Promise.resolve()
  expect(callbacks).toHaveLength(1)
  expect(() => callbacks.shift()!()).toThrow(failure)
  expect(onError).not.toHaveBeenCalled()
  expect(produce).toHaveBeenCalledTimes(2)
  session.destroy()
})
