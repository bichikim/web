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

vi.mock('pixi.js', () => ({
  Container: pixiMocks.ContainerMock,
  Sprite: pixiMocks.SpriteMock,
}))

vi.mock('../texture-leases', () => ({
  acquireTextureGroup: textureMocks.acquire,
  releaseTextureGroup: textureMocks.release,
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
