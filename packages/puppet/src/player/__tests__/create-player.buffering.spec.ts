/** @vitest-environment jsdom */
import {afterEach, expect, test, vi} from 'vitest'
import {createPlayer} from '../create-player'
import {
  configurePlayerBuffering,
  flushPlayerInputs,
  getPlayerBufferingInfo,
} from '../player-buffering'
import {createBufferWorker} from '../buffering/create-buffer-worker'
import {createBufferEngine} from '../buffering/create-buffer-engine'
import {
  createRendererController,
  type RendererController,
} from '../rendering/create-renderer-controller'
import {prepareDocument, puppetDocument} from './fixtures/document'
import type {MotionEvent} from '../playback/types'
import type {BufferFrame, BufferWorker, PlayerBufferingInfo} from '../buffering/types'

vi.mock('../buffering/create-buffer-worker', () => ({createBufferWorker: vi.fn()}))
vi.mock('../rendering/create-renderer-controller', () => ({createRendererController: vi.fn()}))

const setup = async (
  randomSeed?: number,
  onBufferingChange?: (info: PlayerBufferingInfo) => void,
  onMotionEvent?: (event: MotionEvent) => void,
) => {
  const renderer: RendererController = {
    applyFrame: vi.fn(),
    applyPreparedFrame: vi.fn(),
    configure: vi.fn(),
    destroy: vi.fn(),
    getPaintOrder: () => [],
    getPartVertices: vi.fn(),
    getRenderingInfo: () => ({antialiasing: 'ssaa', renderer: 'webgl'}),
    redraw: vi.fn(),
    resize: vi.fn(),
    setRunning: vi.fn(),
    setViewCamera: vi.fn(),
    subscribeFrame: vi.fn(),
    toDocumentPoint: (point) => point,
    updateDocument: () => true,
  }
  let resolve = vi.fn<(frame: BufferFrame) => void>()
  const promise = new Promise<BufferFrame>((complete) => {
    resolve = vi.fn(complete)
  })
  const pending = {promise, resolve}
  const worker = {
    destroy: vi.fn(),
    initialize: vi.fn<BufferWorker['initialize']>().mockResolvedValue(0),
    produce: vi
      .fn<BufferWorker['produce']>()
      .mockImplementation(() => new Promise(() => {}))
      .mockReturnValueOnce(pending.promise),
    reset: vi.fn<BufferWorker['reset']>().mockResolvedValue(undefined),
    updateAudio: vi.fn().mockResolvedValue(undefined),
  }
  vi.mocked(createRendererController).mockResolvedValue(renderer)
  vi.mocked(createBufferWorker).mockReturnValue(worker)
  const animation = prepareDocument({
    ...puppetDocument,
    motions: [{duration: 2, events: [{time: 0.1, value: 'step'}], id: 'walk', tracks: []}],
    parameters: [{defaultValue: 0, id: 'angle', maximum: 1, minimum: 0, name: 'Angle'}],
  })
  vi.stubGlobal('Worker', vi.fn())
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const onFrame = vi.fn()
  const player = await createPlayer({
    canvas: document.createElement('canvas'),
    document: animation,
    onBufferingChange,
    onFrame,
    onMotionEvent,
    randomSeed,
  })
  return {animation, onFrame, pending, player, renderer, worker}
}
afterEach(() => {
  vi.restoreAllMocks()
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

test('should keep buffering disabled for existing createPlayer callers', async () => {
  const {player} = await setup()
  expect(getPlayerBufferingInfo(player).status).toBe('disabled')
  expect(createBufferWorker).not.toHaveBeenCalled()
  player.destroy()
})

test('should retain caller-provided randomness through native fallback when buffering is requested', async () => {
  const {animation, player} = await setup()
  const random = vi.fn(() => 0.5)
  const custom = await createPlayer({
    buffering: true,
    canvas: document.createElement('canvas'),
    document: animation,
    random,
  })
  expect(getPlayerBufferingInfo(custom).status).toBe('unsupported')
  custom.setEyeBlink(true)
  expect(random).toHaveBeenCalled()
  expect(createBufferWorker).not.toHaveBeenCalled()
  custom.destroy()
  player.destroy()
})

test('should recognize a Player across independently loaded library entries', async () => {
  const {player} = await setup()
  vi.resetModules()
  const separateEntry = await import('../player-buffering')
  expect(separateEntry.getPlayerBufferingInfo(player).status).toBe('disabled')
  await expect(separateEntry.configurePlayerBuffering(player, {enabled: true})).resolves.toBe(
    'applied',
  )
  expect(getPlayerBufferingInfo(player).status).toBe('preparing')
  player.destroy()
})

test('should accept controls synchronously while keeping queries on the displayed frame', async () => {
  const {pending, player, renderer, worker} = await setup()
  await configurePlayerBuffering(player, {enabled: true})
  const [state, generation] = worker.reset.mock.calls.at(-1)!
  const request = worker.produce.mock.calls[0]![0]
  vi.mocked(renderer.applyFrame).mockClear()
  expect(player.setParameterValue('angle', 0.5)).toBe(true)
  expect(player.setParameterValue('missing', 0.5)).toBe(false)
  expect(player.getParameterValue('angle')).toBe(0)
  pending.resolve({
    computed: {
      frame: {layers: new Map(), plans: [], spatialPoses: new Map()},
      vertices: new Float32Array(request.buffer),
    },
    deltaTime: request.deltaTime,
    generation,
    inputRevision: 0,
    kind: 'frame',
    playback: {duration: 2, motionId: 'walk', time: 0},
    state: {...state, frameValues: {angle: 0}},
    time: request.time,
  })
  await Promise.resolve()
  await Promise.resolve()
  expect(player.getParameterValue('angle')).toBe(0)
  expect(renderer.applyFrame).not.toHaveBeenCalled()
  expect(renderer.applyPreparedFrame).toHaveBeenCalledOnce()
  expect(worker.produce.mock.calls.at(-1)![0].input?.state.parameterValues.angle).toBe(0.5)
  player.destroy()
})

test('should dispose the Worker on disable and keep the current playback values', async () => {
  const {player, worker} = await setup()
  await configurePlayerBuffering(player, {enabled: true})
  player.setParameterValue('angle', 0.4)
  await configurePlayerBuffering(player, {enabled: false})
  expect(getPlayerBufferingInfo(player)).toMatchObject({enabled: false, status: 'disabled'})
  expect(player.getParameterValue('angle')).toBe(0.4)
  expect(worker.destroy).toHaveBeenCalledOnce()
  player.destroy()
})

test('should honor a newer configuration issued inside the status callback', async () => {
  let newer: Promise<unknown> | undefined
  const {player} = await setup(undefined, (info) => {
    if (info.status === 'disabled') {
      newer = configurePlayerBuffering(player, {enabled: true})
    }
  })
  await configurePlayerBuffering(player, {enabled: true})
  await expect(configurePlayerBuffering(player, {enabled: false})).resolves.toBe('superseded')
  await newer
  expect(getPlayerBufferingInfo(player).enabled).toBe(true)
  player.destroy()
})

test('should keep seeded automatic blinking in the Worker instead of falling back', async () => {
  const {player, renderer} = await setup(42)
  await configurePlayerBuffering(player, {enabled: true})
  vi.mocked(renderer.applyFrame).mockClear()
  player.setEyeBlink(true)
  await Promise.resolve()
  expect(createBufferWorker).toHaveBeenCalledOnce()
  expect(getPlayerBufferingInfo(player).status).toBe('preparing')
  expect(renderer.applyFrame).not.toHaveBeenCalled()
  player.destroy()
})

test('should resume the original path on Worker failure without resetting the document or input', async () => {
  const {player, renderer} = await setup()
  await configurePlayerBuffering(player, {enabled: true})
  player.setParameterValue('angle', 0.7)
  vi.mocked(createBufferWorker).mock.calls[0]![0](new Error('Worker crashed'))
  expect(getPlayerBufferingInfo(player).status).toBe('error')
  expect(player.getParameterValue('angle')).toBe(0.7)
  expect(renderer.setRunning).toHaveBeenLastCalledWith(true)
  player.destroy()
})

test('should retain synchronous commands when a consumer freezes the returned Player', async () => {
  const {player} = await setup()
  Object.freeze(player)
  expect(player.setParameterValue('angle', 0.6)).toBe(true)
  expect(player.getParameterValue('angle')).toBe(0.6)
  await configurePlayerBuffering(player, {enabled: true})
  player.destroy()
})

test('should keep all numeric commands off the main simulation while the Worker owns playback', async () => {
  const {player, renderer} = await setup()
  await configurePlayerBuffering(player, {enabled: true})
  vi.mocked(renderer.applyFrame).mockClear()
  const tick = vi.mocked(renderer.subscribeFrame).mock.calls[0]![0]
  player.setPhysicsOptions({wind: [0.3, 0]})
  player.setModelOpacity(0.5)
  player.setParameterBlend('angle', {mode: 'add', value: 0.1, weight: 0.5})
  player.setLipSync(0.5)
  player.setLookTarget({x: 0.2, y: 0.1})
  player.seek(0.8)
  tick(0.02)
  expect(renderer.applyFrame).not.toHaveBeenCalled()
  expect(renderer.setRunning).toHaveBeenLastCalledWith(false)
  player.destroy()
})

test('should settle pending input through the native path when buffering is explicitly disabled', async () => {
  const {player, renderer} = await setup()
  await configurePlayerBuffering(player, {enabled: true})
  player.setParameterValue('angle', 0.6)
  const flushed = flushPlayerInputs(player)
  await configurePlayerBuffering(player, {enabled: false})
  await expect(flushed).resolves.toBe('applied')
  expect(player.getParameterValue('angle')).toBe(0.6)
  expect(renderer.setRunning).toHaveBeenLastCalledWith(true)
  player.destroy()
})

test('should retain requested input until it is displayed and cancel flush on destruction', async () => {
  const {player, renderer} = await setup()
  await configurePlayerBuffering(player, {enabled: true})
  vi.mocked(renderer.applyFrame).mockClear()
  for (let index = 0; index < 10; index += 1) {
    player.setParameterValue('angle', index / 20)
    player.setLookTarget({x: index / 20, y: 0})
  }
  expect(player.getParameterValue('angle')).toBe(0)
  expect(renderer.applyFrame).not.toHaveBeenCalled()
  const flushed = flushPlayerInputs(player)
  player.destroy()
  await expect(flushed).resolves.toBe('destroyed')
})

test.each(['destroy', 'disable', 'replace'] as const)(
  'should ignore a delayed Worker checkpoint after %s',
  async (boundary) => {
    const {player, worker, renderer, pending, onFrame, animation} = await setup(42)
    await configurePlayerBuffering(player, {enabled: true})
    const [state, generation] = worker.reset.mock.calls.at(-1)!
    const request = worker.produce.mock.calls[0]![0]
    switch (boundary) {
      case 'destroy':
        player.destroy()
        break
      case 'disable':
        await configurePlayerBuffering(player, {enabled: false})
        break
      case 'replace':
        player.updateDocument(prepareDocument({...animation, viewport: {height: 150, width: 300}}))
        break
      default: {
        const exhaustive: never = boundary
        throw new Error(`Unknown lifecycle boundary: ${exhaustive}`)
      }
    }
    const notifications = onFrame.mock.calls.length
    vi.mocked(renderer.applyPreparedFrame).mockClear()
    pending.resolve({
      computed: {
        frame: {layers: new Map(), plans: [], spatialPoses: new Map()},
        vertices: new Float32Array(request.buffer),
      },
      deltaTime: request.deltaTime,
      generation,
      inputRevision: 0,
      kind: 'frame',
      playback: {duration: 2, motionId: 'walk', time: 1},
      state: {...state, frameValues: {angle: 0.9}},
      time: request.time,
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(renderer.applyPreparedFrame).not.toHaveBeenCalled()
    expect(onFrame).toHaveBeenCalledTimes(notifications)
    expect(worker.destroy).toHaveBeenCalled()
    player.destroy()
  },
)

test('should publish Worker controls and continue motion without main numeric evaluation', async () => {
  const {animation, onFrame, player, renderer, worker} = await setup()
  const engine = createBufferEngine(animation)
  worker.reset.mockImplementation(async (state, _generation, revision) =>
    engine.reset(state, revision),
  )
  worker.produce.mockReset().mockImplementation(async (request) => ({
    ...engine.step(request.deltaTime, request.buffer, request.input, request.acknowledgedNotices),
    deltaTime: request.deltaTime,
    generation: request.generation,
    kind: 'frame',
    time: request.time,
  }))
  let now = 0
  vi.spyOn(Date, 'now').mockImplementation(() => now)
  await configurePlayerBuffering(player, {enabled: true})
  vi.mocked(renderer.applyFrame).mockClear()
  for (let index = 1; index <= 12; index += 1) {
    const value = index / 30
    player.setParameterValue('angle', value)
    let completed = false
    const completion = flushPlayerInputs(player).then(() => {
      completed = true
    })
    // eslint-disable-next-line no-unmodified-loop-condition -- Worker promise completion changes the flag between microtasks.
    for (let step = 0; step < 20 && !completed; step += 1) {
      // eslint-disable-next-line no-await-in-loop -- Deliver Worker messages before the controlled display refresh.
      await Promise.resolve()
      now += 20
      vi.mocked(requestAnimationFrame).mock.calls.at(-1)?.[0](now)
    }
    expect(completed).toBe(true)
    // eslint-disable-next-line no-await-in-loop -- Each input waits for its actual displayed result.
    await completion
    expect(player.getParameterValue('angle')).toBe(value)
  }
  expect(onFrame.mock.calls.at(-1)![0].time).toBeGreaterThan(0.2)
  expect(renderer.applyFrame).not.toHaveBeenCalled()
  expect(getPlayerBufferingInfo(player).status).toBe('active')
  player.destroy()
})

test('should supersede pending input waits when a different document is accepted', async () => {
  const {animation, player} = await setup()
  await configurePlayerBuffering(player, {enabled: true})
  player.setParameterValue('angle', 0.6)
  const previous = flushPlayerInputs(player)
  const replacement = prepareDocument({
    ...animation,
    parameters: [{defaultValue: 0.3, id: 'new', maximum: 1, minimum: 0, name: 'New'}],
  })
  expect(player.updateDocument(replacement)).toBe(true)
  await expect(previous).resolves.toBe('superseded')
  const next = flushPlayerInputs(player)
  await configurePlayerBuffering(player, {enabled: false})
  await expect(next).resolves.toBe('applied')
  expect(player.getParameterValue('new')).toBe(0.3)
  player.destroy()
})

test('should retain input issued from a displayed frame callback', async () => {
  const {animation, onFrame, player, renderer, worker} = await setup()
  const engine = createBufferEngine(animation)
  worker.reset.mockImplementation(async (state, _generation, revision) =>
    engine.reset(state, revision),
  )
  worker.produce.mockReset().mockImplementation(async (request) => ({
    ...engine.step(request.deltaTime, request.buffer, request.input, request.acknowledgedNotices),
    deltaTime: request.deltaTime,
    generation: request.generation,
    kind: 'frame',
    time: request.time,
  }))
  let requested = false
  onFrame.mockImplementation(() => {
    if (!requested) {
      requested = true
      player.setParameterValue('angle', 0.7)
    }
  })
  await configurePlayerBuffering(player, {enabled: true})
  vi.mocked(renderer.applyFrame).mockClear()
  let now = 0
  vi.spyOn(Date, 'now').mockImplementation(() => now)
  for (let step = 0; step < 30; step += 1) {
    // eslint-disable-next-line no-await-in-loop -- Delivers each response and any reentrant control.
    await Promise.resolve()
    now += 20
    vi.mocked(requestAnimationFrame).mock.calls.at(-1)?.[0](now)
  }
  expect(requested).toBe(true)
  expect(player.getParameterValue('angle')).toBe(0.7)
  expect(renderer.applyFrame).not.toHaveBeenCalled()
  await expect(flushPlayerInputs(player)).resolves.toBe('applied')
  player.destroy()
})

test('should defer hidden-tab input without main evaluation and resolve pending waits on destroy', async () => {
  const {player, renderer} = await setup()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
  await configurePlayerBuffering(player, {enabled: true})
  vi.mocked(renderer.applyFrame).mockClear()
  player.setParameterValue('angle', 0.8)
  expect(getPlayerBufferingInfo(player).status).toBe('idle')
  expect(renderer.applyFrame).not.toHaveBeenCalled()
  expect(createBufferWorker).not.toHaveBeenCalled()
  const pending = flushPlayerInputs(player)
  player.destroy()
  await expect(pending).resolves.toBe('destroyed')
})

const driveWorker = (context: Awaited<ReturnType<typeof setup>>) => {
  const engine = createBufferEngine(context.animation)
  context.worker.reset.mockImplementation(async (state, _generation, revision) =>
    engine.reset(state, revision),
  )
  context.worker.produce.mockReset().mockImplementation(async (request) => ({
    ...engine.step(request.deltaTime, request.buffer, request.input, request.acknowledgedNotices),
    deltaTime: request.deltaTime,
    generation: request.generation,
    kind: 'frame',
    time: request.time,
  }))
  let now = 0
  vi.spyOn(Date, 'now').mockImplementation(() => now)
  return async (steps: number) => {
    for (let step = 0; step < steps; step += 1) {
      // eslint-disable-next-line no-await-in-loop -- Deliver an ordered Worker response, then its display refresh.
      await Promise.resolve()
      now += 20
      vi.mocked(requestAnimationFrame).mock.calls.at(-1)?.[0](now)
    }
  }
}

test('should deliver presented motion events and completion without disabling the Worker', async () => {
  const event = vi.fn()
  const complete = vi.fn()
  const context = await setup(42, undefined, event)
  const advance = driveWorker(context)
  context.player.play({loop: false, onComplete: complete})
  await configurePlayerBuffering(context.player, {enabled: true})
  vi.mocked(context.renderer.applyFrame).mockClear()
  expect(event).not.toHaveBeenCalled()
  expect(complete).not.toHaveBeenCalled()
  await advance(180)
  expect(event).toHaveBeenCalledExactlyOnceWith({motionId: 'walk', time: 0.1, value: 'step'})
  expect(complete).toHaveBeenCalledOnce()
  expect(getPlayerBufferingInfo(context.player).status).toBe('idle')
  expect(context.renderer.applyFrame).not.toHaveBeenCalled()
  expect(createBufferWorker).toHaveBeenCalledOnce()
  context.player.destroy()
})

test('should compute independent motion controls and automatic blinking in the Worker', async () => {
  const context = await setup(42)
  const advance = driveWorker(context)
  await configurePlayerBuffering(context.player, {enabled: true})
  vi.mocked(context.renderer.applyFrame).mockClear()
  const handle = context.player.startMotion('walk', {loop: true})!
  await advance(20)
  expect(handle.getState().time).toBeGreaterThan(0)
  handle.pause()
  handle.seek(0.5)
  handle.setWeight(0.3)
  handle.setSpeed(2)
  context.player.setEyeBlink(true)
  const flushed = flushPlayerInputs(context.player)
  await advance(20)
  await expect(flushed).resolves.toBe('applied')
  expect(handle.getState()).toMatchObject({speed: 2, status: 'paused', time: 0.5, weight: 0.3})
  handle.resume()
  await advance(20)
  expect(handle.getState().time).toBeGreaterThan(0.5)
  expect(context.renderer.applyFrame).not.toHaveBeenCalled()
  expect(getPlayerBufferingInfo(context.player).status).toBe('active')
  expect(createBufferWorker).toHaveBeenCalledOnce()
  handle.stop()
  context.player.destroy()
})

test('should reject an invalid random seed before allocating GPU resources', async () => {
  const {animation, player} = await setup()
  vi.mocked(createRendererController).mockClear()
  await expect(
    createPlayer({
      canvas: document.createElement('canvas'),
      document: animation,
      randomSeed: Number.NaN,
    }),
  ).rejects.toThrow('Random seed must be finite')
  expect(createRendererController).not.toHaveBeenCalled()
  player.destroy()
})

test('should initialize directly in the Worker without an initial main-thread numeric frame', async () => {
  const {animation, player, renderer} = await setup()
  vi.mocked(renderer.applyFrame).mockClear()
  const buffered = await createPlayer({
    buffering: true,
    canvas: document.createElement('canvas'),
    document: animation,
    randomSeed: 42,
  })
  expect(renderer.applyFrame).not.toHaveBeenCalled()
  expect(getPlayerBufferingInfo(buffered).status).toBe('preparing')
  buffered.destroy()
  player.destroy()
})

test('should acknowledge submitted input before a frame callback destroys its player', async () => {
  const context = await setup(42)
  const advance = driveWorker(context)
  await configurePlayerBuffering(context.player, {enabled: true})
  context.onFrame.mockImplementation(() => {
    if (context.player.getParameterValue('angle') === 0.5) {
      context.player.destroy()
    }
  })
  context.player.setParameterValue('angle', 0.5)
  const flushed = flushPlayerInputs(context.player)
  await advance(20)
  await expect(flushed).resolves.toBe('applied')
  expect(getPlayerBufferingInfo(context.player).status).toBe('destroyed')
})

test('should preserve new motion handles across an older in-flight Worker response', async () => {
  const {player, worker, pending} = await setup(42)
  await configurePlayerBuffering(player, {enabled: true})
  const [state, generation] = worker.reset.mock.calls.at(-1)!
  const request = worker.produce.mock.calls[0]![0]
  const handle = player.startMotion('walk')!
  pending.resolve({
    computed: {
      frame: {layers: new Map(), plans: [], spatialPoses: new Map()},
      vertices: new Float32Array(request.buffer),
    },
    deltaTime: request.deltaTime,
    generation,
    inputRevision: 0,
    kind: 'frame',
    playback: {duration: 2, motionId: 'walk', time: 0},
    state,
    time: request.time,
  })
  await Promise.resolve()
  await Promise.resolve()
  expect(handle.getState().status).toBe('playing')
  handle.pause()
  handle.seek(0.5)
  expect(handle.getState()).toMatchObject({status: 'paused', time: 0.5})
  expect(worker.produce.mock.calls.at(-1)![0].input?.state.additional[0]?.id).toBe(handle.id)
  player.destroy()
})

test('should release renderer resources even when the destruction status callback throws', async () => {
  const failure = new Error('Consumer status failure')
  const {player, renderer, worker} = await setup(42, (info) => {
    if (info.status === 'destroyed') {
      throw failure
    }
  })
  await configurePlayerBuffering(player, {enabled: true})
  expect(() => player.destroy()).toThrow(failure)
  expect(worker.destroy).toHaveBeenCalledOnce()
  expect(renderer.destroy).toHaveBeenCalledOnce()
  expect(() => player.destroy()).not.toThrow()
})

test('should reject numerical commands reentered from the destroyed status callback', async () => {
  let accepted: boolean | undefined
  const {player, renderer} = await setup(42, (info) => {
    if (info.status === 'destroyed') {
      accepted = player.setParameterValue('angle', 0.5)
    }
  })
  vi.mocked(renderer.applyFrame).mockClear()
  player.destroy()
  expect(accepted).toBe(false)
  expect(renderer.applyFrame).not.toHaveBeenCalled()
})

test('should not treat a preparing status callback exception as a Worker failure', async () => {
  const failure = new Error('Consumer preparing failure')
  const {player, worker} = await setup(42, (info) => {
    if (info.status === 'preparing') {
      throw failure
    }
  })
  await expect(configurePlayerBuffering(player, {enabled: true})).rejects.toThrow(failure)
  expect(getPlayerBufferingInfo(player).status).toBe('preparing')
  expect(worker.produce).toHaveBeenCalledOnce()
  expect(worker.destroy).not.toHaveBeenCalled()
  player.destroy()
})

test('should resume the native ticker before reporting a disabled status callback failure', async () => {
  const failure = new Error('Consumer disabled failure')
  const {player, renderer} = await setup(42, (info) => {
    if (info.status === 'disabled') {
      throw failure
    }
  })
  await configurePlayerBuffering(player, {enabled: true})
  vi.mocked(renderer.setRunning).mockClear()
  await expect(configurePlayerBuffering(player, {enabled: false})).rejects.toThrow(failure)
  expect(getPlayerBufferingInfo(player).status).toBe('disabled')
  expect(renderer.setRunning).toHaveBeenLastCalledWith(true)
  player.destroy()
})

test('should release a player whose initial buffering status callback rejects creation', async () => {
  const {animation, player, renderer, worker} = await setup(42)
  const failure = new Error('Initial status observer failed')
  await expect(
    createPlayer({
      buffering: true,
      canvas: document.createElement('canvas'),
      document: animation,
      onBufferingChange(info) {
        if (info.status === 'preparing') {
          throw failure
        }
      },
      randomSeed: 42,
    }),
  ).rejects.toThrow(failure)
  expect(worker.destroy).toHaveBeenCalledOnce()
  expect(renderer.destroy).toHaveBeenCalledOnce()
  player.destroy()
})

test('should retain both errors when initial creation and its destruction observer fail', async () => {
  const {animation, player, renderer, worker} = await setup(42)
  const initial = new Error('Initial status failed')
  const disposal = new Error('Destruction status failed')
  let received: unknown
  try {
    await createPlayer({
      buffering: true,
      canvas: document.createElement('canvas'),
      document: animation,
      onBufferingChange(info) {
        if (info.status === 'preparing') {
          throw initial
        }
        if (info.status === 'destroyed') {
          throw disposal
        }
      },
      randomSeed: 42,
    })
  } catch (cause) {
    received = cause
  }
  expect(received).toBeInstanceOf(AggregateError)
  expect(received).toMatchObject({cause: initial, errors: [initial, disposal]})
  expect(worker.destroy).toHaveBeenCalledOnce()
  expect(renderer.destroy).toHaveBeenCalledOnce()
  player.destroy()
})
