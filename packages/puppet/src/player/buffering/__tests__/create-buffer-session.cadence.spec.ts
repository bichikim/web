import {expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../create-empty-document'
import {createBufferEngine} from '../create-buffer-engine'
import {createBufferSession} from '../create-buffer-session'
import type {
  BufferedInput,
  BufferFrame,
  BufferRefreshCallback,
  BufferWorker,
  ProduceBufferFrame,
} from '../types'

test('presents native playback directly and coalesces missed refreshes', async () => {
  const document = createEmptyDocument()
  const engine = createBufferEngine(document)
  const state = engine.step(0, new ArrayBuffer(0)).state
  const requests: ProduceBufferFrame[] = []
  const callbacks: BufferRefreshCallback[] = []
  const onFrame = vi.fn()
  const onError = vi.fn()
  let complete: (() => void) | undefined
  let now = 0
  const session = createBufferSession({
    createWorker: () => ({
      destroy: vi.fn(),
      initialize: vi.fn().mockResolvedValue(0),
      produce: (request) =>
        new Promise((resolve) => {
          requests.push(request)
          complete = () =>
            resolve({
              ...engine.step(request.deltaTime, request.buffer, request.input),
              deltaTime: request.deltaTime,
              generation: request.generation,
              kind: 'frame',
              time: request.time,
            })
        }),
      reset: vi.fn().mockResolvedValue(undefined),
      updateAudio: vi.fn().mockResolvedValue(undefined),
    }),
    document,
    onError,
    onFrame,
    presentDuringPlayback: true,
    scheduler: {
      cancelFrame: vi.fn(),
      now: () => now,
      queueMicrotask,
      requestFrame(callback) {
        return callbacks.push(callback)
      },
    },
  })
  const tick = (time: number) => {
    now = time
    callbacks.shift()!(time)
  }
  const finish = async () => {
    complete!()
    await Promise.resolve()
    await Promise.resolve()
  }
  try {
    await session.ready
    await session.start(state)
    tick(8)
    tick(16)
    expect(requests.map(({time}) => time)).toEqual([0])
    await finish()
    expect(onFrame).toHaveBeenCalledOnce()
    expect(requests.map(({time}) => time)).toEqual([0, 16])
    await finish()
    expect(onFrame).toHaveBeenCalledTimes(2)
    expect(requests).toHaveLength(2)
    tick(24)
    expect(requests.map(({time}) => time)).toEqual([0, 16, 24])
    expect(onError).not.toHaveBeenCalled()
  } finally {
    session.destroy()
  }
})

test.each([
  {afterDisplay: [1, 2, 4], beforeDisplay: [1, 2], stage: 'before-physics'},
  {afterDisplay: [1, 2, 3], beforeDisplay: [1, 2, 3], stage: 'interaction'},
] as const)(
  'should prioritize $stage input while the next frame is ready',
  async ({beforeDisplay, afterDisplay, stage}) => {
    const document = createEmptyDocument()
    const engine = createBufferEngine(document)
    const state = engine.step(0, new ArrayBuffer(0)).state
    const requests: Array<{request: ProduceBufferFrame; resolve: (frame: BufferFrame) => void}> = []
    const shown: number[] = []
    let finishDisplay!: () => void
    const firstDisplay = new Promise<void>((resolve) => {
      finishDisplay = resolve
    })
    let input: BufferedInput | undefined
    const session = createBufferSession({
      createWorker: () => ({
        destroy: vi.fn(),
        initialize: vi.fn().mockResolvedValue(0),
        produce: (request) =>
          new Promise((resolve) => {
            requests.push({request, resolve})
          }),
        reset: vi.fn().mockResolvedValue(undefined),
        updateAudio: vi.fn().mockResolvedValue(undefined),
      }),
      document,
      input: () => input,
      onError: vi.fn(),
      onFrame(frame) {
        shown.push(frame.inputRevision)
        return frame.inputRevision === 1 ? firstDisplay : undefined
      },
      running: () => false,
      scheduler: {
        cancelFrame: vi.fn(),
        now: () => 0,
        queueMicrotask,
        requestFrame: vi.fn().mockReturnValue(1),
      },
    })
    const change = (revision: number) => {
      input = {
        adjustmentBase: state,
        revision,
        settle: false,
        state: {
          ...state,
          adjustments: {
            ...state.adjustments,
            blends: {
              ...state.adjustments.blends,
              [stage]: new Map([['angle', {mode: 'add', value: revision}]]),
            },
          },
        },
      }
      session.refresh()
    }
    const finish = async (index: number) => {
      const {request, resolve} = requests[index]!
      resolve({
        ...engine.step(request.deltaTime, request.buffer, request.input),
        deltaTime: request.deltaTime,
        generation: request.generation,
        kind: 'frame',
        time: request.time,
      })
      await Promise.resolve()
      await Promise.resolve()
    }
    const revisions = () => requests.map(({request}) => request.input?.revision)

    try {
      await session.ready
      change(1)
      await session.start(state)
      change(2)
      await finish(0)
      await finish(1)
      change(3)
      change(4)
      expect(shown).toEqual([1])
      expect(revisions()).toEqual(beforeDisplay)
      finishDisplay()
      await Promise.resolve()
      expect(shown).toEqual([1, 2])
      expect(revisions()).toEqual(afterDisplay)
    } finally {
      session.destroy()
    }
  },
)

test('should display an already due prediction while computing newer input', async () => {
  const document = createEmptyDocument()
  const engine = createBufferEngine(document)
  const state = engine.step(0, new ArrayBuffer(0)).state
  let now = 0
  let input: BufferedInput | undefined
  const requests: Array<{request: ProduceBufferFrame; resolve: (frame: BufferFrame) => void}> = []
  const onFrame = vi.fn()
  const session = createBufferSession({
    createWorker: () => ({
      destroy: vi.fn(),
      initialize: vi.fn().mockResolvedValue(0),
      produce: (request) =>
        new Promise((resolve) => {
          requests.push({request, resolve})
        }),
      reset: vi.fn().mockResolvedValue(undefined),
      updateAudio: vi.fn().mockResolvedValue(undefined),
    }),
    document,
    input: () => input,
    onError: vi.fn(),
    onFrame,
    scheduler: {
      cancelFrame: vi.fn(),
      now: () => now,
      queueMicrotask,
      requestFrame: vi.fn().mockReturnValue(1),
    },
  })
  try {
    await session.ready
    await session.start(state)
    now = 30
    input = {revision: 1, settle: false, state}
    session.refresh()
    const {request, resolve} = requests[0]!
    resolve({
      ...engine.step(request.deltaTime, request.buffer),
      deltaTime: request.deltaTime,
      generation: request.generation,
      kind: 'frame',
      time: request.time,
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(onFrame).toHaveBeenCalledOnce()
    expect(requests[1]!.request.input?.revision).toBe(1)
    expect(requests[1]!.request.deltaTime).toBe(0)
  } finally {
    session.destroy()
  }
})

test('should resume predicted display without waiting for a clock advanced by rapid input', async () => {
  const document = createEmptyDocument()
  const engine = createBufferEngine(document)
  const state = engine.step(0, new ArrayBuffer(0)).state
  let now = 0
  let revision = 1
  let input: BufferedInput | undefined = {revision, settle: false, state}
  const frames: BufferFrame[] = []
  const callbacks = new Map<number, BufferRefreshCallback>()
  const requests: Array<{request: ProduceBufferFrame; resolve: (frame: BufferFrame) => void}> = []
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
  let handle = 0
  const session = createBufferSession({
    createWorker: () => worker,
    document,
    input: () => input,
    onError: vi.fn(),
    onFrame: (frame) => {
      frames.push(frame)
    },
    scheduler: {
      cancelFrame: (id) => {
        callbacks.delete(id)
      },
      now: () => now,
      queueMicrotask,
      requestFrame: (callback) => {
        handle += 1
        callbacks.set(handle, callback)
        return handle
      },
    },
  })
  const finish = async () => {
    const next = requests.shift()
    if (next === undefined) {
      return
    }
    const {request, resolve} = next
    resolve({
      ...engine.step(request.deltaTime, request.buffer, request.input),
      deltaTime: request.deltaTime,
      generation: request.generation,
      kind: 'frame',
      time: request.time,
    })
    await Promise.resolve()
    await Promise.resolve()
  }
  const refresh = () => {
    const ready = [...callbacks.values()]
    callbacks.clear()
    ready.forEach((callback) => callback(now))
  }
  try {
    await session.ready
    await session.start(state)
    for (let index = 0; index < 60; index += 1) {
      now += 10
      revision += 1
      input = {revision, settle: false, state}
      session.refresh()
      // eslint-disable-next-line no-await-in-loop -- Each simulated response consumes the current input burst.
      await finish()
    }
    expect(frames.length).toBeGreaterThan(20)
    input = undefined
    await finish()
    await finish()
    await finish()
    const displayed = frames.length
    now += 17
    refresh()
    await finish()
    now += 17
    refresh()
    await finish()
    now += 17
    refresh()
    await finish()
    expect(frames.length).toBeGreaterThan(displayed)
    expect(frames.at(-1)!.time).toBeLessThanOrEqual(now)
  } finally {
    session.destroy()
  }
})
