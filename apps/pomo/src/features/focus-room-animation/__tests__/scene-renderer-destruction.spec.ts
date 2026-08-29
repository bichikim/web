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

describe('PSceneRenderer destruction', () => {
  it('should destroy current and incoming layer scenes and stop late layer renders', async () => {
    const {renderer} = createRenderer()
    await renderer.initialize(createState({layerScene: layerDefinition('current')}))
    renderer.update(
      createState({
        depthSource: '/next-depth.webp',
        layerScene: layerDefinition('next'),
        source: '/next.webp',
      }),
    )
    await flushPromises()
    const renderBeforeDestroy = applications[0].render.mock.calls.length

    renderer.destroy()
    layerRender?.()

    expect(layerScenes[0].destroy).toHaveBeenCalled()
    expect(layerScenes[1].destroy).toHaveBeenCalled()
    expect(depthFilters[0].destroy).toHaveBeenCalled()
    expect(parallaxInstances[0].destroy).toHaveBeenCalled()
    expect(loadings[0].destroy).toHaveBeenCalled()
    expect(applications[0].destroy).toHaveBeenCalledWith(true)
    expect(applications[0].render).toHaveBeenCalledTimes(renderBeforeDestroy)
  })
})
