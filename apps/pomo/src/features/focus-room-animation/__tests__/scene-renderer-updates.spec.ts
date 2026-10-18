/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createRendererMocks} from './support/renderer'

import {type PixiLayerSceneDefinition} from '../layer-scene'

import {PSceneRenderer, type PSceneState} from '../scene-renderer'

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
  depthFilters,
  eyesInstances,
  layerScenes,
  mouths,
  parallaxInstances,
  steamInstances,
} = mocks

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

describe('PSceneRenderer updates and motion', () => {
  it('should update controllers without syncing scenes before initialization', () => {
    const {renderer} = createRenderer()
    renderer.update(createState({viseme: 'wide'}))

    expect(steamInstances[0].setSceneStyle).toHaveBeenCalledWith('original')
    expect(eyesInstances[0].update).toHaveBeenCalled()
    expect(mouths[0].update).toHaveBeenCalledWith('wide', 'wide', false)
    expect(steamInstances[0].ensure).not.toHaveBeenCalled()
  })

  it('should update motion input, depth offsets, and pan positioning', async () => {
    const {renderer} = createRenderer()
    await renderer.initialize(createState())
    vi.clearAllMocks()

    const renderParallax = mocks.callbacks.parallaxRender
    renderParallax?.(0.5, -0.5)
    expect(depthFilters[0].setPointerOffset).toHaveBeenCalledWith(2.5, -3)
    expect(steamInstances[0].setParallaxOffset.mock.calls[0]?.[0]).toBeCloseTo(-1.375)
    expect(steamInstances[0].setParallaxOffset.mock.calls[0]?.[1]).toBeCloseTo(1.65)
    expect(applications[0].canvas.style.getPropertyValue('--pomo-scene-object-position')).toBe(
      '60% center',
    )
    expect(applications[0].canvas.style.objectPosition).toBe('')

    renderer.update(createState({motionInput: 'gyroscope', motionMode: 'pan', viseme: 'open'}))
    expect(parallaxInstances[0].setInputMode).toHaveBeenCalledWith('gyroscope')
    expect(depthFilters[0].setPointerOffset).toHaveBeenLastCalledWith(0, 0)
    expect(steamInstances[0].setParallaxOffset).toHaveBeenLastCalledWith(0, 0)
    expect(applications[0].canvas.style.getPropertyValue('--pomo-scene-object-position')).toBe(
      '65% center',
    )
    expect(applications[0].canvas.style.objectPosition).toBe('')
    expect(mouths[0].update).toHaveBeenCalledWith('rest', 'open', false)

    vi.clearAllMocks()
    renderer.update(createState({motionInput: 'gyroscope', motionMode: 'pan', viseme: 'open'}))
    expect(parallaxInstances[0].setInputMode).not.toHaveBeenCalled()
    expect(depthFilters[0].setPointerOffset).not.toHaveBeenCalled()

    renderer.update(createState({motionMode: 'pan', viseme: 'open'}))
    expect(parallaxInstances[0].setInputMode).toHaveBeenCalledWith('drag')
  })

  it('should use rest when reduced motion changes before any state is supplied', () => {
    createRenderer()

    const changeMotion = mocks.callbacks.reducedMotionChange
    changeMotion?.(true)

    expect(mouths[0].setReducedMotion).toHaveBeenCalledWith('rest', true)
  })

  it('should apply reduced motion to controllers and render without an incoming scene', async () => {
    const definition = layerDefinition()
    const {renderer} = createRenderer()
    await renderer.initialize(createState({layerScene: definition, viseme: 'round'}))
    vi.clearAllMocks()

    const changeMotion = mocks.callbacks.reducedMotionChange
    changeMotion?.(true)

    expect(layerScenes[0].setAnimationEnabled).toHaveBeenCalledWith(false)
    expect(steamInstances[0].setReducedMotion).toHaveBeenCalledWith(true)
    expect(mouths[0].setReducedMotion).toHaveBeenCalledWith('round', true)
    expect(applications[0].render).toHaveBeenCalledOnce()

    const currentChangeMotion = mocks.callbacks.reducedMotionChange
    currentChangeMotion?.(false)
    expect(layerScenes[0].setAnimationEnabled).toHaveBeenCalledWith(true)
  })
})
