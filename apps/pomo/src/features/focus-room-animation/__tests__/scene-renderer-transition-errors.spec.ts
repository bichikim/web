/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createRendererMocks} from './support/renderer'

import {type PixiLayerSceneDefinition} from '../layer-scene'

import {PSceneRenderer, type PSceneState} from '../scene-renderer'

import {acquireTextureGroup, releaseTextureGroup} from '../texture-leases'

vi.mock('pixi.js', () => ({
  Application: vi.fn(),
  Container: vi.fn(),
  Sprite: vi.fn(),
}))
vi.mock('../depth-parallax-filter', () => ({DepthParallaxFilter: vi.fn()}))
vi.mock('../eye-animation-controller', () => ({PEyeController: vi.fn()}))
vi.mock('../layer-scene', () => ({PixiLayerScene: vi.fn()}))
vi.mock('../parallax-controller', () => ({ParallaxController: vi.fn()}))
vi.mock('../scene-composite-transition', () => ({
  createSceneTransitions: vi.fn(),
  SCENE_HEIGHT: 900,
  SCENE_WIDTH: 1600,
}))
vi.mock('../scene-motion', () => ({getPScenePanPosition: vi.fn()}))
vi.mock('../scene-loading-state', () => ({SceneLoadingState: vi.fn()}))
vi.mock('../scene-mouth-controller', () => ({createPSceneMouthController: vi.fn()}))
vi.mock('../scene-steam-controller', () => ({PSceneSteamController: vi.fn()}))
vi.mock('../texture-leases', () => ({
  acquireTextureGroup: vi.fn(),
  releaseTextureGroup: vi.fn(),
}))

const mocks = createRendererMocks()
const {eyesInstances, layerScenes, loadings, transitionInstances} = mocks

const createLease = (source: string) => ({source, texture: {source}})

const createState = (overrides: Partial<PSceneState> = {}): PSceneState => ({
  activity: 'reading',
  depthSource: '/depth.webp',
  gaze: 'user',
  layerScene: null,
  sceneStyle: 'original',
  source: '/scene.webp',
  time: 'day',
  viseme: 'rest',
  ...overrides,
})

const layerDefinition = (id = 'layers'): PixiLayerSceneDefinition => ({
  background: '#fff',
  height: 100,
  id,
  layers: [{id: 'base', source: '/layer.webp'}],
  width: 100,
})

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

const createRenderer = (options = {}) => {
  const host = document.createElement('div')
  const renderer = new PSceneRenderer(host, options)
  return {host, renderer}
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.install()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('PSceneRenderer transitions', () => {
  it('should discard a stale prepared transition when a newer request wins', async () => {
    let resolveFirst: ((leases: never) => void) | undefined
    vi.mocked(acquireTextureGroup)
      .mockResolvedValueOnce([createLease('/scene.webp'), createLease('/depth.webp')] as never)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockResolvedValueOnce([
        createLease('/third.webp'),
        createLease('/third-depth.webp'),
      ] as never)
    const {renderer} = createRenderer()
    await renderer.initialize(createState())
    vi.clearAllMocks()

    renderer.update(createState({depthSource: '/second-depth.webp', source: '/second.webp'}))
    renderer.update(createState({depthSource: '/third-depth.webp', source: '/third.webp'}))
    await flushPromises()
    resolveFirst?.([createLease('/second.webp'), createLease('/second-depth.webp')] as never)
    await flushPromises()

    expect(releaseTextureGroup).toHaveBeenCalledWith([
      createLease('/second.webp'),
      createLease('/second-depth.webp'),
    ])
    expect(transitionInstances[0].start).toHaveBeenCalledOnce()
  })

  it('should reset an active request after transition preparation fails', async () => {
    vi.mocked(acquireTextureGroup)
      .mockResolvedValueOnce([createLease('/scene.webp'), createLease('/depth.webp')] as never)
      .mockRejectedValueOnce(new Error('next failed'))
    const {renderer} = createRenderer()
    await renderer.initialize(createState())
    vi.clearAllMocks()

    renderer.update(createState({depthSource: '/next-depth.webp', source: '/next.webp'}))
    await flushPromises()

    expect(loadings[0].finish).toHaveBeenCalledOnce()
    expect(eyesInstances[0].setSceneReady).toHaveBeenCalledWith(true)
    expect(globalThis.reportError).toHaveBeenCalledWith(new Error('next failed'))
  })

  it('should suppress transition errors after destruction', async () => {
    let rejectNext: ((error: Error) => void) | undefined
    vi.mocked(acquireTextureGroup)
      .mockResolvedValueOnce([createLease('/scene.webp'), createLease('/depth.webp')] as never)
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectNext = reject
          }),
      )
    const {renderer} = createRenderer()
    await renderer.initialize(createState())

    renderer.update(createState({depthSource: '/next-depth.webp', source: '/next.webp'}))
    renderer.destroy()
    rejectNext?.(new Error('late failure'))
    await flushPromises()

    expect(globalThis.reportError).not.toHaveBeenCalled()
  })

  it('should return when transition preparation finishes after destruction', async () => {
    let resolveNext: ((leases: never) => void) | undefined
    vi.mocked(acquireTextureGroup)
      .mockResolvedValueOnce([createLease('/scene.webp'), createLease('/depth.webp')] as never)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNext = resolve
          }),
      )
    const {renderer} = createRenderer()
    await renderer.initialize(createState())
    renderer.update(createState({depthSource: '/next-depth.webp', source: '/next.webp'}))
    renderer.destroy()
    const nextTextures = [createLease('/next.webp'), createLease('/next-depth.webp')]

    resolveNext?.(nextTextures as never)
    await flushPromises()

    expect(releaseTextureGroup).toHaveBeenCalledWith(nextTextures)
    expect(transitionInstances[0].start).not.toHaveBeenCalled()
  })

  it('should destroy a stale prepared layer scene', async () => {
    let resolveLayer: ((leases: never) => void) | undefined
    vi.mocked(acquireTextureGroup)
      .mockResolvedValueOnce([createLease('/scene.webp'), createLease('/depth.webp')] as never)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveLayer = resolve
          }),
      )
      .mockResolvedValueOnce([createLease('/third-depth.webp')] as never)
    const {renderer} = createRenderer()
    await renderer.initialize(createState())

    renderer.update(
      createState({
        depthSource: '/layer-depth.webp',
        layerScene: layerDefinition('stale-layer'),
        source: '/layer.webp',
      }),
    )
    renderer.update(
      createState({
        depthSource: '/third-depth.webp',
        layerScene: layerDefinition('third-layer'),
        source: '/third.webp',
      }),
    )
    await flushPromises()
    resolveLayer?.([createLease('/layer-depth.webp')] as never)
    await flushPromises()

    expect(layerScenes[1].destroy).toHaveBeenCalled()
  })
})
