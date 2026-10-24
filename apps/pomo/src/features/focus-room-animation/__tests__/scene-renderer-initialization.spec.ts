/** @vitest-environment jsdom */

import {Application, Sprite} from 'pixi.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createRendererMocks} from './support/renderer'

import {DepthParallaxFilter} from '../depth-parallax-filter'

import {PixiLayerScene, type PixiLayerSceneDefinition} from '../layer-scene'

import {SCENE_HEIGHT, SCENE_WIDTH} from '../scene-composite-transition'

import {SceneLoadingState} from '../scene-loading-state'

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
const {
  applications,
  containers,
  createApplication,
  createContainer,
  createLayerScene,
  eyesInstances,
  layerScenes,
  loadings,
  mouths,
  parallaxInstances,
  steamInstances,
  transitionInstances,
} = mocks

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

describe('PSceneRenderer initialization', () => {
  it('should initialize and render a static scene', async () => {
    const onLoadingChange = vi.fn()
    const onMotionInputChange = vi.fn()
    const {host, renderer} = createRenderer({onLoadingChange, onMotionInputChange})
    const state = createState()

    await renderer.initialize(state)

    expect(loadings[0].start).toHaveBeenCalledOnce()
    expect(SceneLoadingState).toHaveBeenCalledWith(onLoadingChange)
    expect(applications[0].init).toHaveBeenCalledWith({
      antialias: false,
      autoStart: false,
      backgroundAlpha: 0,
      height: SCENE_HEIGHT,
      preference: 'webgl',
      resolution: 1,
      width: SCENE_WIDTH,
    })
    expect(applications[0].canvas.getAttribute('aria-hidden')).toBe('true')
    expect(applications[0].canvas.className).toContain('[--pomo-scene-object-position:60%_center]')
    expect(applications[0].canvas.className).toContain(
      '[object-position:var(--pomo-scene-object-position)]',
    )
    expect(host.contains(applications[0].canvas)).toBe(true)
    expect(acquireTextureGroup).toHaveBeenCalledWith(['/scene.webp', '/depth.webp'])
    expect(Sprite).toHaveBeenCalledWith({source: '/scene.webp'})
    expect(DepthParallaxFilter).toHaveBeenCalledWith({source: '/depth.webp'})
    expect(applications[0].stage.addChild).toHaveBeenCalled()
    expect(eyesInstances[0].initialize).toHaveBeenCalledWith(state)
    expect(steamInstances[0].ensure).toHaveBeenCalledWith('original')
    expect(parallaxInstances[0].setInputMode).toHaveBeenCalledWith('drag')
    expect(parallaxInstances[0].start).toHaveBeenCalledOnce()
    expect(steamInstances[0].start).toHaveBeenCalledOnce()
    expect(eyesInstances[0].setSceneReady).toHaveBeenCalledWith(true)
    expect(loadings[0].finishAfterPaint).toHaveBeenCalledOnce()
  })

  it('should initialize a layer scene, place eyes in its attachment, and use latest state', async () => {
    const attachment = createContainer()
    vi.mocked(PixiLayerScene).mockImplementationOnce(
      function MockAttachedLayerScene(_definition, options) {
        mocks.callbacks.layerRender = options?.onRender
        const layerScene = createLayerScene()
        layerScene.getAttachment.mockReturnValue(attachment)
        return layerScene as never
      },
    )
    const definition = layerDefinition()
    const {renderer} = createRenderer()
    const initial = createState({layerScene: definition})
    const initializing = renderer.initialize(initial)
    renderer.update(
      createState({
        layerScene: definition,
        motionInput: 'gyroscope',
        sceneStyle: 'scribble',
        viseme: 'open',
      }),
    )
    await initializing

    expect(acquireTextureGroup).toHaveBeenCalledWith(['/depth.webp'])
    expect(layerScenes[0].initialize).toHaveBeenCalledWith({animationEnabled: true})
    expect(mouths[0].getLayerState).toHaveBeenCalledWith('open', false, layerScenes[0])
    expect(attachment.addChild).toHaveBeenCalledWith(eyesInstances[0].container)
    expect(parallaxInstances[0].setInputMode).toHaveBeenCalledWith('gyroscope')
    expect(steamInstances[0].ensure).toHaveBeenLastCalledWith('scribble')
    const readLayerScenes = mocks.callbacks.getLayerScenes
    expect(readLayerScenes?.()).toEqual([layerScenes[0], null])
    vi.clearAllMocks()
    const renderEyes = mocks.callbacks.eyesRender
    renderEyes?.()
    const renderSteam = mocks.callbacks.steamRender
    renderSteam?.()
    expect(applications[0].render).toHaveBeenCalledTimes(2)
    const readReducedMotion = mocks.callbacks.readReducedMotion
    expect(readReducedMotion?.()).toBe(false)
    const renderLayer = mocks.callbacks.layerRender
    renderLayer?.()
    expect(applications[0].render).toHaveBeenCalledTimes(3)
  })

  it('should return after scene preparation finishes on a destroyed renderer', async () => {
    let resolveTextures: ((leases: never) => void) | undefined
    vi.mocked(acquireTextureGroup).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTextures = resolve
        }),
    )
    const {renderer} = createRenderer()
    const initializing = renderer.initialize(createState())
    await flushPromises()

    renderer.destroy()
    const textures = [createLease('/scene.webp'), createLease('/depth.webp')]
    resolveTextures?.(textures as never)
    await initializing

    expect(releaseTextureGroup).toHaveBeenCalledWith(textures)
    expect(DepthParallaxFilter).not.toHaveBeenCalled()
    expect(parallaxInstances[0].start).not.toHaveBeenCalled()
  })

  it('should transition to state received while initial resources are loading', async () => {
    let resolveInitial: ((leases: never) => void) | undefined
    vi.mocked(acquireTextureGroup)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveInitial = resolve
          }),
      )
      .mockResolvedValueOnce([createLease('/next.webp'), createLease('/next-depth.webp')] as never)
    const {renderer} = createRenderer()
    const initializing = renderer.initialize(createState())
    await flushPromises()
    renderer.update(createState({depthSource: '/next-depth.webp', source: '/next.webp'}))
    resolveInitial?.([createLease('/scene.webp'), createLease('/depth.webp')] as never)
    await initializing
    await flushPromises()

    expect(transitionInstances[0].start).toHaveBeenCalledOnce()
    expect(acquireTextureGroup).toHaveBeenLastCalledWith(['/next.webp', '/next-depth.webp'])
  })

  it('should destroy an application whose initialization finishes after renderer destruction', async () => {
    let resolveInit: (() => void) | undefined
    vi.mocked(Application).mockImplementationOnce(function MockDelayedApplication() {
      const application = createApplication()
      application.init.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveInit = resolve
          }),
      )
      return application as never
    })
    const {renderer} = createRenderer()

    const initializing = renderer.initialize(createState())
    renderer.destroy()
    resolveInit?.()
    await initializing

    expect(applications[0].destroy).toHaveBeenCalledWith(true)
    expect(acquireTextureGroup).not.toHaveBeenCalled()
    renderer.destroy()
    expect(applications[0].destroy).toHaveBeenCalledOnce()
  })

  it('should destroy the renderer when initial scene loading fails', async () => {
    vi.mocked(acquireTextureGroup).mockRejectedValueOnce(new Error('texture failed'))
    const {renderer} = createRenderer()

    await expect(renderer.initialize(createState())).rejects.toThrow('texture failed')

    expect(mouths[0].destroy).toHaveBeenCalledOnce()
    expect(eyesInstances[0].destroy).toHaveBeenCalledOnce()
    expect(steamInstances[0].destroy).toHaveBeenCalledOnce()
    expect(applications[0].destroy).toHaveBeenCalledWith(true)
  })

  it('should release a prepared scene when depth filter creation fails', async () => {
    vi.mocked(DepthParallaxFilter).mockImplementationOnce(function MockFailingDepthFilter() {
      throw new Error('filter failed')
    })
    const {renderer} = createRenderer()

    await expect(renderer.initialize(createState())).rejects.toThrow('filter failed')

    expect(containers.at(-1)?.destroy).toHaveBeenCalled()
    expect(releaseTextureGroup).toHaveBeenCalledWith([
      createLease('/scene.webp'),
      createLease('/depth.webp'),
    ])
  })

  it('should destroy a layer scene when its initialization fails', async () => {
    vi.mocked(PixiLayerScene).mockImplementationOnce(function MockFailingLayerScene() {
      const scene = createLayerScene()
      scene.initialize.mockRejectedValue(new Error('layer failed'))
      return scene as never
    })
    const {renderer} = createRenderer()

    await expect(renderer.initialize(createState({layerScene: layerDefinition()}))).rejects.toThrow(
      'layer failed',
    )

    expect(layerScenes[0].destroy).toHaveBeenCalled()
    expect(releaseTextureGroup).toHaveBeenCalled()
  })

  it('should default a missing viseme while creating a layer scene', async () => {
    const {renderer} = createRenderer()

    await renderer.initialize(
      createState({layerScene: layerDefinition(), viseme: undefined as never}),
    )

    expect(mouths[0].getLayerState).toHaveBeenCalledWith('rest', false, layerScenes[0])
  })
})
