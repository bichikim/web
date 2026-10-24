/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const pixiMocks = vi.hoisted(() => {
  const sprites: SpriteMock[] = []

  class ContainerMock {
    readonly addChild = vi.fn()
    readonly destroy = vi.fn()
  }

  class SpriteMock {
    readonly position = {set: vi.fn()}
    texture: unknown
    visible = true

    constructor(texture: unknown) {
      this.texture = texture
      sprites.push(this)
    }
  }

  return {ContainerMock, SpriteMock, sprites}
})

const textureMocks = vi.hoisted(() => ({
  acquire: vi.fn(),
  release: vi.fn(),
}))

const schedulerMocks = vi.hoisted(() => ({
  create: vi.fn(),
  destroy: vi.fn(),
  onBlink: null as null | (() => Promise<void>),
  start: vi.fn(),
}))

vi.mock('pixi.js', () => ({
  Container: pixiMocks.ContainerMock,
  Sprite: pixiMocks.SpriteMock,
}))

vi.mock('../texture-leases', () => ({
  acquireTextureGroup: textureMocks.acquire,
  releaseTextureGroup: textureMocks.release,
}))

vi.mock('../blink-scheduler', () => ({
  createBlinkScheduler: schedulerMocks.create,
}))

import {PEyeController, type PEyeState} from '../eye-animation-controller'

const createLeases = (sources: readonly string[]) =>
  sources.map((source) => ({release: vi.fn(), source, texture: {source}}))

const createState = (state: Partial<PEyeState> = {}): PEyeState => ({
  activity: 'reading',
  gaze: 'focused',
  sceneStyle: 'original',
  time: 'day',
  ...state,
})

beforeEach(() => {
  pixiMocks.sprites.length = 0
  textureMocks.acquire
    .mockReset()
    .mockImplementation(async (sources: readonly string[]) => createLeases(sources))
  textureMocks.release.mockReset()
  schedulerMocks.destroy.mockReset()
  schedulerMocks.start.mockReset()
  schedulerMocks.onBlink = null
  schedulerMocks.create
    .mockReset()
    .mockImplementation(({onBlink}: {onBlink: () => Promise<void>}) => {
      schedulerMocks.onBlink = onBlink
      return {destroy: schedulerMocks.destroy, start: schedulerMocks.start}
    })
  vi.stubGlobal('reportError', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should load only the eye frames required by the initial state', async () => {
  const controller = new PEyeController(vi.fn())

  await controller.initialize(createState())

  const sources = textureMocks.acquire.mock.calls[0][0] as readonly string[]
  expect(sources).toHaveLength(2)
  expect(sources.every((source) => source.includes('/day-focused/'))).toBe(true)

  controller.destroy()
})

it('should replace the current eye textures when the style changes', async () => {
  const controller = new PEyeController(vi.fn())
  await controller.initialize(createState())
  const initialLeases = textureMocks.acquire.mock.results[0].value

  controller.update(createState({sceneStyle: 'scribble'}))

  await vi.waitFor(() => expect(textureMocks.acquire).toHaveBeenCalledTimes(2))
  const sources = textureMocks.acquire.mock.calls[1][0] as readonly string[]
  expect(sources).toHaveLength(4)
  expect(sources.every((source) => source.includes('/day-focused-scribble/'))).toBe(true)
  expect(textureMocks.release).toHaveBeenCalledWith(await initialLeases)

  controller.destroy()
})

it('should discard a stale eye texture request after a newer state wins', async () => {
  let resolveStale: (leases: ReturnType<typeof createLeases>) => void = () => undefined
  const controller = new PEyeController(vi.fn())
  await controller.initialize(createState())
  textureMocks.acquire.mockImplementation((sources: readonly string[]) => {
    if (sources.every((source) => source.includes('/night-focused/'))) {
      return new Promise((resolve) => {
        resolveStale = resolve
      })
    }

    return Promise.resolve(createLeases(sources))
  })

  controller.update(createState({time: 'night'}))
  controller.update(createState({gaze: 'user', time: 'night'}))

  await vi.waitFor(() => expect(textureMocks.acquire).toHaveBeenCalledTimes(3))
  const staleSources = textureMocks.acquire.mock.calls[1][0] as readonly string[]
  const staleLeases = createLeases(staleSources)
  resolveStale(staleLeases)

  await vi.waitFor(() => expect(textureMocks.release).toHaveBeenCalledWith(staleLeases))

  controller.destroy()
})

it('should keep the current eye textures visible when their replacement fails', async () => {
  const controller = new PEyeController(vi.fn())
  await controller.initialize(createState({sceneStyle: 'scribble'}))
  const [eyeSprite, pupilSprite] = pixiMocks.sprites
  const loadError = new Error('replacement failed')
  textureMocks.acquire.mockRejectedValueOnce(loadError)

  controller.update(createState())

  await vi.waitFor(() => expect(globalThis.reportError).toHaveBeenCalledWith(loadError))
  expect(eyeSprite.visible).toBe(true)
  expect(pupilSprite.visible).toBe(true)

  controller.destroy()
})

it('should use the latest state when initialization changes while textures load', async () => {
  let resolveInitial: (leases: ReturnType<typeof createLeases>) => void = () => undefined
  textureMocks.acquire.mockImplementationOnce(
    (sources: readonly string[]) =>
      new Promise((resolve) => {
        resolveInitial = resolve
      }),
  )
  const controller = new PEyeController(vi.fn())
  const initialization = controller.initialize(createState())

  controller.update(createState({gaze: 'user'}))
  const initialSources = textureMocks.acquire.mock.calls[0][0] as readonly string[]
  resolveInitial(createLeases(initialSources))
  await initialization

  expect(textureMocks.acquire).toHaveBeenCalledTimes(2)
  expect(textureMocks.release).toHaveBeenCalledTimes(1)
  expect((textureMocks.acquire.mock.calls[1][0] as readonly string[])[0]).toContain('/day-user/')
  controller.destroy()
})

it('should release initialization textures when destroyed before loading completes', async () => {
  let resolveLoad: (leases: ReturnType<typeof createLeases>) => void = () => undefined
  textureMocks.acquire.mockImplementationOnce(
    (sources: readonly string[]) =>
      new Promise((resolve) => {
        resolveLoad = resolve
      }),
  )
  const controller = new PEyeController(vi.fn())
  controller.update(createState())
  const initialization = controller.initialize(createState())

  controller.destroy()
  controller.destroy()
  const sources = textureMocks.acquire.mock.calls[0][0] as readonly string[]
  const leases = createLeases(sources)
  resolveLoad(leases)
  await initialization

  expect(textureMocks.release).toHaveBeenCalledWith(leases)
  expect(pixiMocks.sprites).toHaveLength(0)
})

it('should skip initialization after destruction', async () => {
  const controller = new PEyeController(vi.fn())
  controller.destroy()

  await controller.initialize(createState())

  expect(textureMocks.acquire).not.toHaveBeenCalled()
})

it('should render fixed modes and restart automatic blinking only when ready', async () => {
  const onRender = vi.fn()
  const controller = new PEyeController(onRender)
  await controller.initialize(createState({sceneStyle: 'scribble'}))
  const [eyeSprite, pupilSprite] = pixiMocks.sprites

  controller.setMode('half')
  expect(eyeSprite.visible).toBe(true)
  controller.setMode('half')
  controller.setMode('closed')
  controller.setMode('open')
  expect(pupilSprite.visible).toBe(true)
  controller.setMode('auto')
  expect(schedulerMocks.start).not.toHaveBeenCalled()

  controller.setSceneReady(true)
  controller.setMode('closed')
  controller.setMode('auto')
  expect(schedulerMocks.start).toHaveBeenCalledTimes(2)
  expect(onRender).toHaveBeenCalled()
  controller.destroy()
  expect(schedulerMocks.destroy).toHaveBeenCalledOnce()
})

it('should render original closed and half frames while open remains transparent', async () => {
  const controller = new PEyeController(vi.fn())
  await controller.initialize(createState({time: 'night'}))
  const [eyeSprite, pupilSprite] = pixiMocks.sprites

  expect(eyeSprite.visible).toBe(false)
  expect(pupilSprite.visible).toBe(false)
  controller.setMode('half')
  expect(eyeSprite.position.set).toHaveBeenLastCalledWith(854, 250)
  controller.setMode('closed')
  expect(eyeSprite.visible).toBe(true)
  controller.update(createState({activity: 'typing', time: 'night'}))
  expect(textureMocks.acquire).toHaveBeenCalledOnce()
  controller.destroy()
})

it('should animate a complete blink and stop a superseded blink', async () => {
  vi.useFakeTimers()
  const controller = new PEyeController(vi.fn())
  await controller.initialize(createState({sceneStyle: 'scribble'}))

  await schedulerMocks.onBlink?.()
  controller.setSceneReady(true)
  const completeBlink = schedulerMocks.onBlink?.()
  await vi.advanceTimersByTimeAsync(48 + 72 + 48)
  await completeBlink

  const interruptedBlink = schedulerMocks.onBlink?.()
  controller.setMode('closed')
  await vi.advanceTimersByTimeAsync(48)
  await interruptedBlink
  controller.setSceneReady(false)
  vi.useRealTimers()
  controller.destroy()
})

it('should move scribble pupils and cancel their timer when the scene pauses', async () => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(1)
  const controller = new PEyeController(vi.fn())
  await controller.initialize(createState({gaze: 'user', sceneStyle: 'scribble'}))
  const [, pupilSprite] = pixiMocks.sprites

  controller.setSceneReady(true)
  await vi.advanceTimersByTimeAsync(1_400)
  expect(pupilSprite.position.set).toHaveBeenCalled()
  controller.setSceneReady(false)
  controller.setSceneReady(false)
  vi.useRealTimers()
  controller.destroy()
})

it('should honor readiness set before initialization', async () => {
  const controller = new PEyeController(vi.fn())
  controller.setMode('closed')
  controller.setSceneReady(true)

  await controller.initialize(createState())

  expect(schedulerMocks.start).toHaveBeenCalledOnce()
  controller.destroy()
})

it('should ignore duplicate pending replacements and clear a superseded failure', async () => {
  let rejectReplacement: (error: Error) => void = () => undefined
  const controller = new PEyeController(vi.fn())
  await controller.initialize(createState())
  textureMocks.acquire.mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectReplacement = reject
      }),
  )

  const replacementState = createState({time: 'night'})
  controller.update(replacementState)
  controller.update(replacementState)
  expect(textureMocks.acquire).toHaveBeenCalledTimes(2)
  controller.update(createState())
  rejectReplacement(new Error('superseded'))
  await vi.waitFor(() => expect(globalThis.reportError).toHaveBeenCalled())
  controller.destroy()
})

it('should hide an eye frame when its acquired texture is missing', async () => {
  textureMocks.acquire.mockImplementationOnce(async (sources: readonly string[]) => {
    const leases = createLeases(sources)
    return [leases[0], {...leases[1], texture: undefined}]
  })
  const controller = new PEyeController(vi.fn())
  await controller.initialize(createState())
  const [eyeSprite] = pixiMocks.sprites

  controller.setMode('closed')

  expect(eyeSprite.visible).toBe(false)
  controller.destroy()
})

it('should stop pupil and blink callbacks at each interrupted stage', async () => {
  vi.useFakeTimers()
  const controller = new PEyeController(vi.fn())
  await controller.initialize(createState({sceneStyle: 'scribble'}))
  controller.setSceneReady(true)

  const duringClosed = schedulerMocks.onBlink?.()
  await vi.advanceTimersByTimeAsync(48)
  controller.setMode('closed')
  await vi.advanceTimersByTimeAsync(72)
  await duringClosed

  controller.setMode('auto')
  const duringFinalHalf = schedulerMocks.onBlink?.()
  await vi.advanceTimersByTimeAsync(48 + 72)
  controller.setMode('closed')
  await vi.advanceTimersByTimeAsync(48)
  await duringFinalHalf

  controller.setMode('open')
  controller.setSceneReady(true)
  controller.setMode('closed')
  await vi.advanceTimersByTimeAsync(3_200)
  vi.useRealTimers()
  controller.destroy()
})
