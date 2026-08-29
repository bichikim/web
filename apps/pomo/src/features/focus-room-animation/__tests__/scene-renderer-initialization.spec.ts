/** @vitest-environment jsdom */

import {Application, Container, Sprite} from 'pixi.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {DepthParallaxFilter} from '../depth-parallax-filter'
import {PEyeController} from '../eye-animation-controller'
import {PixiLayerScene, type PixiLayerSceneDefinition} from '../layer-scene'
import {ParallaxController} from '../parallax-controller'
import {createSceneTransitions, SCENE_HEIGHT, SCENE_WIDTH} from '../scene-composite-transition'
import {getPScenePanPosition} from '../scene-motion'
import {SceneLoadingState} from '../scene-loading-state'
import {createPSceneMouthController} from '../scene-mouth-controller'
import {PSceneRenderer, type PSceneState} from '../scene-renderer'
import {PSceneSteamController} from '../scene-steam-controller'
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

interface MockContainer {
  addChild: ReturnType<typeof vi.fn>
  children: unknown[]
  destroy: ReturnType<typeof vi.fn>
  filters: unknown
  parent: MockContainer | null
  removeFromParent: ReturnType<typeof vi.fn>
}

interface MockApplication {
  canvas: HTMLCanvasElement
  destroy: ReturnType<typeof vi.fn>
  init: ReturnType<typeof vi.fn>
  render: ReturnType<typeof vi.fn>
  stage: MockContainer
}

interface MockEyes {
  container: MockContainer
  destroy: ReturnType<typeof vi.fn>
  initialize: ReturnType<typeof vi.fn>
  setSceneReady: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

interface MockLayerScene {
  container: MockContainer
  destroy: ReturnType<typeof vi.fn>
  getAttachment: ReturnType<typeof vi.fn>
  initialize: ReturnType<typeof vi.fn>
  setAnimationEnabled: ReturnType<typeof vi.fn>
}

interface MockLoading {
  destroy: ReturnType<typeof vi.fn>
  finish: ReturnType<typeof vi.fn>
  finishAfterPaint: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
}

interface MockMouth {
  destroy: ReturnType<typeof vi.fn>
  getLayerState: ReturnType<typeof vi.fn>
  setReducedMotion: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

interface MockParallax {
  destroy: ReturnType<typeof vi.fn>
  prefersReducedMotion: boolean
  setInputMode: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
}

interface MockSteam {
  destroy: ReturnType<typeof vi.fn>
  ensure: ReturnType<typeof vi.fn>
  setParallaxOffset: ReturnType<typeof vi.fn>
  setReducedMotion: ReturnType<typeof vi.fn>
  setSceneStyle: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
}

interface MockTransitions {
  cancelDepthTransition?: ReturnType<typeof vi.fn>
  capture: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
  setProgress: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
}

interface MockDepthFilter {
  cancelDepthTransition: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
  finishDepthTransition: ReturnType<typeof vi.fn>
  setDepthMix: ReturnType<typeof vi.fn>
  setDepthTransition: ReturnType<typeof vi.fn>
  setPointerOffset: ReturnType<typeof vi.fn>
}

const applications: MockApplication[] = []
const containers: MockContainer[] = []
const depthFilters: MockDepthFilter[] = []
const eyesInstances: MockEyes[] = []
const layerScenes: MockLayerScene[] = []
const loadings: MockLoading[] = []
const mouths: MockMouth[] = []
const parallaxInstances: MockParallax[] = []
const steamInstances: MockSteam[] = []
const transitionInstances: MockTransitions[] = []
let parallaxRender: ((x: number, y: number) => void) | undefined
let reducedMotionChange: ((prefersReducedMotion: boolean) => void) | undefined
let layerRender: (() => void) | undefined
let getLayerScenes: (() => readonly unknown[]) | undefined
let eyesRender: (() => void) | undefined
let steamGetReducedMotion: (() => boolean) | undefined
let steamRender: (() => void) | undefined
let nextFrameId = 1
const frameCallbacks = new Map<number, FrameRequestCallback>()

const createContainer = (): MockContainer => {
  const container: MockContainer = {
    addChild: vi.fn((child: {parent?: MockContainer | null}) => {
      container.children.push(child)
      child.parent = container
      return child
    }),
    children: [],
    destroy: vi.fn(),
    filters: null,
    parent: null,
    removeFromParent: vi.fn(() => {
      container.parent = null
    }),
  }
  containers.push(container)
  return container
}

const createApplication = (): MockApplication => {
  const application: MockApplication = {
    canvas: document.createElement('canvas'),
    destroy: vi.fn(),
    init: vi.fn().mockResolvedValue(undefined),
    render: vi.fn(),
    stage: createContainer(),
  }
  applications.push(application)
  return application
}

const createEyes = (): MockEyes => {
  const eyes: MockEyes = {
    container: createContainer(),
    destroy: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
    setSceneReady: vi.fn(),
    update: vi.fn(),
  }
  eyesInstances.push(eyes)
  return eyes
}

const createLayerSceneMock = (): MockLayerScene => {
  const scene: MockLayerScene = {
    container: createContainer(),
    destroy: vi.fn(),
    getAttachment: vi.fn().mockReturnValue(null),
    initialize: vi.fn().mockResolvedValue(undefined),
    setAnimationEnabled: vi.fn(),
  }
  layerScenes.push(scene)
  return scene
}

const createLoading = (): MockLoading => {
  const loading: MockLoading = {
    destroy: vi.fn(),
    finish: vi.fn(),
    finishAfterPaint: vi.fn(),
    start: vi.fn(),
  }
  loadings.push(loading)
  return loading
}

const createMouth = (): MockMouth => {
  const mouth: MockMouth = {
    destroy: vi.fn(),
    getLayerState: vi.fn().mockReturnValue({animationEnabled: true}),
    setReducedMotion: vi.fn(),
    update: vi.fn(),
  }
  mouths.push(mouth)
  return mouth
}

const createSteam = (): MockSteam => {
  const steam: MockSteam = {
    destroy: vi.fn(),
    ensure: vi.fn().mockResolvedValue(undefined),
    setParallaxOffset: vi.fn(),
    setReducedMotion: vi.fn(),
    setSceneStyle: vi.fn(),
    start: vi.fn(),
  }
  steamInstances.push(steam)
  return steam
}

const createTransitions = (): MockTransitions => {
  const transitions: MockTransitions = {
    capture: vi.fn(),
    destroy: vi.fn(),
    restore: vi.fn(),
    setProgress: vi.fn(),
    start: vi.fn(),
  }
  transitionInstances.push(transitions)
  return transitions
}

const createDepthFilter = (): MockDepthFilter => {
  const filter: MockDepthFilter = {
    cancelDepthTransition: vi.fn(),
    destroy: vi.fn(),
    finishDepthTransition: vi.fn(),
    setDepthMix: vi.fn(),
    setDepthTransition: vi.fn(),
    setPointerOffset: vi.fn(),
  }
  depthFilters.push(filter)
  return filter
}

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
  applications.length = 0
  containers.length = 0
  depthFilters.length = 0
  eyesInstances.length = 0
  frameCallbacks.clear()
  layerScenes.length = 0
  loadings.length = 0
  mouths.length = 0
  nextFrameId = 1
  parallaxInstances.length = 0
  steamInstances.length = 0
  transitionInstances.length = 0
  layerRender = undefined
  getLayerScenes = undefined
  eyesRender = undefined
  parallaxRender = undefined
  reducedMotionChange = undefined
  steamGetReducedMotion = undefined
  steamRender = undefined

  vi.mocked(Application).mockImplementation(function MockApplicationConstructor() {
    return createApplication() as never
  })
  vi.mocked(Container).mockImplementation(function MockContainerConstructor() {
    return createContainer() as never
  })
  vi.mocked(Sprite).mockImplementation(function MockSpriteConstructor(texture) {
    const sprite = createContainer() as MockContainer & {texture: unknown}
    sprite.texture = texture
    return sprite as never
  })
  vi.mocked(DepthParallaxFilter).mockImplementation(function MockDepthFilterConstructor() {
    return createDepthFilter() as never
  })
  vi.mocked(PEyeController).mockImplementation(function MockEyesConstructor(onRender) {
    eyesRender = onRender
    return createEyes() as never
  })
  vi.mocked(PixiLayerScene).mockImplementation(
    function MockLayerSceneConstructor(_definition, options) {
      layerRender = options?.onRender
      return createLayerSceneMock() as never
    },
  )
  vi.mocked(ParallaxController).mockImplementation(
    function MockParallaxConstructor(_host, render, options) {
      parallaxRender = render
      reducedMotionChange = options?.onMotionPreferenceChange
      const parallax: MockParallax = {
        destroy: vi.fn(),
        prefersReducedMotion: false,
        setInputMode: vi.fn(),
        start: vi.fn(),
      }
      parallaxInstances.push(parallax)
      return parallax as never
    },
  )
  vi.mocked(createSceneTransitions).mockImplementation(() => createTransitions() as never)
  vi.mocked(getPScenePanPosition).mockImplementation((value) => 60 + value * 10)
  vi.mocked(SceneLoadingState).mockImplementation(function MockLoadingConstructor() {
    return createLoading() as never
  })
  vi.mocked(createPSceneMouthController).mockImplementation((getScenes) => {
    getLayerScenes = getScenes
    return createMouth() as never
  })
  vi.mocked(PSceneSteamController).mockImplementation(function MockSteamConstructor(options) {
    steamGetReducedMotion = options.getPrefersReducedMotion
    steamRender = options.onRender
    return createSteam() as never
  })
  vi.mocked(acquireTextureGroup).mockImplementation(
    async (sources) => sources.map(createLease) as never,
  )
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const frameId = nextFrameId
    nextFrameId += 1
    frameCallbacks.set(frameId, callback)
    return frameId
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frameId) => {
    frameCallbacks.delete(frameId)
  })
  vi.spyOn(window.performance, 'now').mockReturnValue(100)
  vi.stubGlobal('reportError', vi.fn())
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
    expect(applications[0].canvas.className).toContain('object-[60%_center]')
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
        layerRender = options?.onRender
        const layerScene = createLayerSceneMock()
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
    expect(getLayerScenes?.()).toEqual([layerScenes[0], null])
    vi.clearAllMocks()
    eyesRender?.()
    steamRender?.()
    expect(applications[0].render).toHaveBeenCalledTimes(2)
    expect(steamGetReducedMotion?.()).toBe(false)
    layerRender?.()
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
      const scene = createLayerSceneMock()
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
