import {expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import {createBufferEngine} from '../create-buffer-engine'
import {createBufferSession} from '../create-buffer-session'
import type {BufferFrame, BufferRefreshCallback, BufferScheduler, BufferWorker} from '../types'

const createScheduler = () => {
  let now = 0
  let sequence = 0
  const frames = new Map<number, BufferRefreshCallback>()
  const cancelFrame = vi.fn((handle: number) => {
    frames.delete(handle)
  })
  const requestFrame = vi.fn((callback: BufferRefreshCallback) => {
    sequence += 1
    frames.set(sequence, callback)
    return sequence
  })
  const scheduler: BufferScheduler = {
    cancelFrame,
    now: () => now,
    queueMicrotask,
    requestFrame,
  }
  return {
    advance(milliseconds: number, timestamp?: number) {
      now += milliseconds
      const ready = [...frames.values()]
      frames.clear()
      ready.forEach((callback) => callback(timestamp))
    },
    cancelFrame,
    requestFrame,
    scheduler,
  }
}

test('should refill a full prediction queue before presenting its next frame', async () => {
  const document = createEmptyDocument()
  const engine = createBufferEngine(document)
  const state = engine.step(0, new ArrayBuffer(0)).state
  const requests: Array<{
    request: import('../types').ProduceBufferFrame
    resolve: (frame: BufferFrame) => void
  }> = []
  const worker: BufferWorker = {
    destroy: vi.fn(),
    initialize: vi.fn().mockResolvedValue(0),
    produce: (request) =>
      new Promise((resolve) => {
        requests.push({request, resolve})
      }),
    reset: vi.fn().mockResolvedValue(undefined),
    updateAudio: vi.fn().mockResolvedValue(undefined),
  }
  const {advance, scheduler} = createScheduler()
  const seen: number[] = []
  const session = createBufferSession({
    createWorker: () => worker,
    document,
    onError: vi.fn(),
    onFrame: () => seen.push(requests.length),
    scheduler,
  })
  await session.ready
  await session.start(state)
  for (const index of [0, 1, 2]) {
    const {request, resolve} = requests[index]!
    resolve({
      ...engine.step(request.deltaTime, request.buffer),
      deltaTime: request.deltaTime,
      generation: request.generation,
      kind: 'frame',
      time: request.time,
    })
    // eslint-disable-next-line no-await-in-loop -- Each completion fills the next ordered queue slot.
    await Promise.resolve()
  }
  expect(requests).toHaveLength(3)
  advance(100, 0)
  advance(25, 1000 / 120)
  expect(seen).toEqual([4])
  expect(requests[3]!.request.deltaTime).toBeCloseTo(1 / 120, 10)
  session.destroy()
})

test('should recover display cadence after a delayed Worker response without stretching future frames', async () => {
  const document = createEmptyDocument()
  const engine = createBufferEngine(document)
  const state = engine.step(0, new ArrayBuffer(0)).state
  const requests: Array<{
    request: import('../types').ProduceBufferFrame
    resolve: (frame: BufferFrame) => void
  }> = []
  const worker: BufferWorker = {
    destroy: vi.fn(),
    initialize: vi.fn().mockResolvedValue(0),
    produce: (request) =>
      new Promise((resolve) => {
        requests.push({request, resolve})
      }),
    reset: vi.fn().mockResolvedValue(undefined),
    updateAudio: vi.fn().mockResolvedValue(undefined),
  }
  const {advance, scheduler} = createScheduler()
  const session = createBufferSession({
    createWorker: () => worker,
    document,
    onError: vi.fn(),
    onFrame: vi.fn(),
    scheduler,
  })
  const finish = async (index: number) => {
    const {request, resolve} = requests[index]!
    resolve({
      ...engine.step(request.deltaTime, request.buffer),
      deltaTime: request.deltaTime,
      generation: request.generation,
      kind: 'frame',
      time: request.time,
    })
    await Promise.resolve()
  }
  await session.ready
  await session.start(state)
  advance(100)
  await finish(0)
  expect(requests[1]!.request.time).toBeCloseTo(100 + 1000 / 60, 8)
  advance(5)
  await finish(1)
  expect(requests[2]!.request.deltaTime).toBeCloseTo(1 / 60, 10)
  expect(requests[2]!.request.time).toBeGreaterThan(requests[1]!.request.time)
  session.destroy()
})

test('should base pending input on the submitted checkpoint rather than prefill it early', async () => {
  const document = createEmptyDocument()
  const engine = createBufferEngine(document)
  let checkpoint = engine.step(0, new ArrayBuffer(0)).state
  let pending = false
  const requests: Array<{
    request: import('../types').ProduceBufferFrame
    resolve: (frame: BufferFrame) => void
  }> = []
  const worker: BufferWorker = {
    destroy: vi.fn(),
    initialize: vi.fn().mockResolvedValue(0),
    produce: (request) =>
      new Promise((resolve) => {
        requests.push({request, resolve})
      }),
    reset: vi.fn().mockResolvedValue(undefined),
    updateAudio: vi.fn().mockResolvedValue(undefined),
  }
  const {advance, scheduler} = createScheduler()
  const seen: number[] = []
  const session = createBufferSession({
    createWorker: () => worker,
    document,
    input: () => (pending ? {revision: 1, settle: false, state: checkpoint} : undefined),
    onError: vi.fn(),
    onFrame: (frame) => {
      seen.push(requests.length)
      checkpoint = frame.state
    },
    scheduler,
  })
  await session.ready
  await session.start(checkpoint)
  for (const index of [0, 1, 2]) {
    const {request, resolve} = requests[index]!
    resolve({
      ...engine.step(request.deltaTime, request.buffer),
      deltaTime: request.deltaTime,
      generation: request.generation,
      kind: 'frame',
      time: request.time,
    })
    // eslint-disable-next-line no-await-in-loop -- Predictions must fill before pending input arrives.
    await Promise.resolve()
  }
  advance(100)
  pending = true
  advance(25)
  expect(seen).toEqual([3])
  expect(requests[3]!.request.input?.state).toBe(checkpoint)
  expect(requests[3]!.request.input?.revision).toBe(1)
  session.destroy()
})

test('should start the next prediction before preparing queued display objects', async () => {
  const document = createEmptyDocument()
  const engine = createBufferEngine(document)
  const state = engine.step(0, new ArrayBuffer(0)).state
  const events: string[] = []
  const worker: BufferWorker = {
    destroy: vi.fn(),
    initialize: vi.fn().mockResolvedValue(0),
    produce: vi.fn(async (request) => {
      events.push('produce')
      const result = engine.step(request.deltaTime, request.buffer)
      return {
        ...result,
        computed: {
          ...result.computed,
          frame: {
            get layers() {
              events.push('layers')
              return new Map()
            },
            get plans() {
              events.push('plans')
              return []
            },
            spatialPoses: new Map(),
          },
        },
        deltaTime: request.deltaTime,
        generation: request.generation,
        kind: 'frame' as const,
        time: request.time,
      }
    }),
    reset: vi.fn().mockResolvedValue(undefined),
    updateAudio: vi.fn().mockResolvedValue(undefined),
  }
  const base = createScheduler()
  let scheduled = () => {}
  const ready = new Promise<void>((resolve) => {
    scheduled = resolve
  })
  const session = createBufferSession({
    createWorker: () => worker,
    document,
    onError: vi.fn(),
    onFrame: vi.fn(),
    scheduler: {
      ...base.scheduler,
      requestFrame(callback) {
        const handle = base.scheduler.requestFrame(callback)
        scheduled()
        return handle
      },
    },
  })
  await session.ready
  await session.start(state)
  await ready
  expect(events.slice(0, 2)).toEqual(['produce', 'produce'])
  expect(events.slice(2, 4)).toEqual(expect.arrayContaining(['plans', 'layers']))
  session.destroy()
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
  const {scheduler} = createScheduler()
  let running = true
  const onFrame = vi.fn()
  const session = createBufferSession({
    createWorker: () => worker,
    document,
    onError: vi.fn(),
    onFrame,
    running: () => running,
    scheduler,
  })
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
  const {advance, scheduler} = createScheduler()
  const onFrame = vi.fn<(frame: BufferFrame) => void>()
  const session = createBufferSession({
    createWorker: () => worker,
    document,
    onError: vi.fn(),
    onFrame,
    scheduler,
  })
  await session.ready
  await session.start(state)
  for (let index = 0; index < 32; index += 1) {
    // eslint-disable-next-line no-await-in-loop -- Each simulated refresh consumes the previous Worker response.
    await Promise.resolve()
    advance(25)
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
  const {advance, scheduler} = createScheduler()
  const onFrame = vi.fn()
  const session = createBufferSession({
    createWorker: () => worker,
    document,
    onError: vi.fn(),
    onFrame,
    scheduler,
  })
  await session.ready
  await session.start(state)
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  advance(75)
  advance(25)
  expect(onFrame).toHaveBeenCalledOnce()
  session.invalidate()
  await session.start(state)
  await Promise.resolve()
  advance(25)
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
  const worker: BufferWorker = {
    destroy: vi.fn(),
    initialize: vi.fn().mockResolvedValue(0),
    produce: (request) =>
      new Promise((resolve) => {
        requests.push({request, resolve})
      }),
    reset: vi.fn().mockResolvedValue(undefined),
    updateAudio: vi.fn().mockResolvedValue(undefined),
  }
  const {scheduler} = createScheduler()
  const onFrame = vi.fn((frame) => {
    if (input?.revision === frame.inputRevision) {
      input = undefined
    }
  })
  const session = createBufferSession({
    createWorker: () => worker,
    document: createEmptyDocument(),
    input: () => input,
    onError: vi.fn(),
    onFrame,
    scheduler,
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
  const {requestFrame, scheduler} = createScheduler()
  const onFrame = vi.fn(() => {
    input = undefined
  })
  const session = createBufferSession({
    createWorker: () => worker,
    document,
    input: () => input,
    onError: vi.fn(),
    onFrame,
    running: () => false,
    scheduler,
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
  expect(requestFrame).not.toHaveBeenCalled()
  expect(vi.mocked(worker.produce).mock.calls[1]![0].deltaTime).toBe(0)
  session.destroy()
})

test('should report host callback exceptions outside the Worker failure path and release the frame', async () => {
  const document = createEmptyDocument()
  const engine = createBufferEngine(document)
  const state = engine.step(0, new ArrayBuffer(0)).state
  const callbacks: Array<() => void> = []
  const {scheduler} = createScheduler()
  const produce = vi.fn(async (request: import('../types').ProduceBufferFrame) => ({
    ...engine.step(request.deltaTime, request.buffer, request.input, request.acknowledgedNotices),
    deltaTime: request.deltaTime,
    generation: request.generation,
    kind: 'frame' as const,
    time: request.time,
  }))
  const worker: BufferWorker = {
    destroy: vi.fn(),
    initialize: vi.fn().mockResolvedValue(0),
    produce,
    reset: vi.fn().mockResolvedValue(undefined),
    updateAudio: vi.fn().mockResolvedValue(undefined),
  }
  const failure = new Error('Consumer callback failed')
  const onError = vi.fn()
  const session = createBufferSession({
    createWorker: () => worker,
    document,
    input: () => ({revision: 1, settle: false, state}),
    onError,
    onFrame: () => {
      throw failure
    },
    running: () => false,
    scheduler: {
      ...scheduler,
      queueMicrotask(callback) {
        callbacks.push(callback)
      },
    },
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

test('should cancel only its own frames when sessions share a scheduler', async () => {
  const {advance, cancelFrame, scheduler} = createScheduler()
  const setup = () => {
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
    const onFrame = vi.fn()
    const session = createBufferSession({
      createWorker: () => worker,
      document,
      onError: vi.fn(),
      onFrame,
      scheduler,
    })
    return {onFrame, session, state, worker}
  }
  const first = setup()
  const second = setup()
  await Promise.all([first.session.ready, second.session.ready])
  await Promise.all([first.session.start(first.state), second.session.start(second.state)])
  await Promise.resolve()
  await Promise.resolve()
  first.session.destroy()
  expect(cancelFrame).toHaveBeenCalledOnce()
  expect(first.worker.destroy).toHaveBeenCalledOnce()
  expect(second.worker.destroy).not.toHaveBeenCalled()
  advance(100)
  advance(25)
  expect(first.onFrame).not.toHaveBeenCalled()
  expect(second.onFrame).toHaveBeenCalledOnce()
  second.session.destroy()
  advance(100)
  expect(second.onFrame).toHaveBeenCalledOnce()
  expect(second.worker.destroy).toHaveBeenCalledOnce()
})
