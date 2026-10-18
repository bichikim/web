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
const {
  containers,
  depthFilters,
  eyesInstances,
  frameCallbacks,
  layerScenes,
  loadings,
  parallaxInstances,
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

describe('PSceneRenderer transitions', () => {
  it.each([0, 10_000])(
    'should animate from the first frame at %i and release the previous scene',
    async (startedAt) => {
      const {renderer} = createRenderer()
      await renderer.initialize(createState())
      const previousScene = containers.at(-1)
      vi.clearAllMocks()

      renderer.update(createState({depthSource: '/next-depth.webp', source: '/next.webp'}))
      await flushPromises()

      expect(transitionInstances[0].capture).toHaveBeenCalledWith(previousScene)
      expect(depthFilters[0].setDepthTransition).toHaveBeenCalledWith({source: '/next-depth.webp'})
      expect(transitionInstances[0].start).toHaveBeenCalled()
      expect(frameCallbacks.size).toBe(1)

      const firstFrame = [...frameCallbacks.values()][0]
      firstFrame?.(startedAt)
      expect(transitionInstances[0].setProgress).toHaveBeenLastCalledWith(0)
      expect(depthFilters[0].setDepthMix).toHaveBeenLastCalledWith(0)

      const middleFrame = [...frameCallbacks.values()].at(-1)
      middleFrame?.(startedAt + 300)
      expect(transitionInstances[0].setProgress).toHaveBeenCalledWith(0.5)
      expect(depthFilters[0].setDepthMix).toHaveBeenCalledWith(0.5)

      const finalFrame = [...frameCallbacks.values()].at(-1)
      finalFrame?.(startedAt + 600)
      expect(transitionInstances[0].restore).toHaveBeenCalled()
      expect(depthFilters[0].finishDepthTransition).toHaveBeenCalled()
      expect(releaseTextureGroup).toHaveBeenCalledWith([
        createLease('/scene.webp'),
        createLease('/depth.webp'),
      ])
      expect(loadings[0].finishAfterPaint).toHaveBeenCalled()
    },
  )

  it('should finish a transition immediately when reduced motion is already preferred', async () => {
    const {renderer} = createRenderer()
    await renderer.initialize(createState())
    parallaxInstances[0].prefersReducedMotion = true
    vi.clearAllMocks()

    renderer.update(createState({depthSource: '/next-depth.webp', source: '/next.webp'}))
    await flushPromises()

    expect(transitionInstances[0].setProgress).toHaveBeenCalledWith(1)
    expect(depthFilters[0].setDepthMix).toHaveBeenCalledWith(1)
    expect(globalThis.requestAnimationFrame).not.toHaveBeenCalled()
    expect(depthFilters[0].finishDepthTransition).toHaveBeenCalled()
  })

  it('should complete an in-flight transition when reduced motion becomes preferred', async () => {
    const definition = layerDefinition('current')
    const {renderer} = createRenderer()
    await renderer.initialize(createState({layerScene: definition}))
    vi.clearAllMocks()

    renderer.update(
      createState({
        depthSource: '/next-depth.webp',
        layerScene: layerDefinition('next'),
        source: '/next.webp',
      }),
    )
    await flushPromises()
    expect(layerScenes).toHaveLength(2)
    const frameId = [...frameCallbacks.keys()][0]

    const changeMotion = mocks.callbacks.reducedMotionChange
    changeMotion?.(true)

    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(frameId)
    expect(layerScenes[0].setAnimationEnabled).toHaveBeenCalledWith(false)
    expect(layerScenes[1].setAnimationEnabled).toHaveBeenCalledWith(false)
    expect(depthFilters[0].finishDepthTransition).toHaveBeenCalled()
  })

  it('should finish reduced motion without cancelling when no frame was scheduled yet', async () => {
    const {renderer} = createRenderer()
    await renderer.initialize(createState())
    transitionInstances[0].start.mockImplementationOnce(() => {
      parallaxInstances[0].prefersReducedMotion = true
      const changeMotion = mocks.callbacks.reducedMotionChange
      changeMotion?.(true)
    })
    vi.clearAllMocks()

    renderer.update(createState({depthSource: '/next-depth.webp', source: '/next.webp'}))
    await flushPromises()

    expect(globalThis.cancelAnimationFrame).not.toHaveBeenCalled()
    expect(depthFilters[0].finishDepthTransition).toHaveBeenCalled()
  })

  it('should ignore an obsolete animation frame after a newer transition starts', async () => {
    const {renderer} = createRenderer()
    await renderer.initialize(createState())
    renderer.update(createState({depthSource: '/second-depth.webp', source: '/second.webp'}))
    await flushPromises()
    const obsoleteFrame = [...frameCallbacks.values()][0]

    renderer.update(createState({depthSource: '/third-depth.webp', source: '/third.webp'}))
    await flushPromises()
    vi.clearAllMocks()
    obsoleteFrame?.(200)

    expect(transitionInstances[0].setProgress).not.toHaveBeenCalled()
  })

  it('should ignore an animation frame after destruction', async () => {
    const {renderer} = createRenderer()
    await renderer.initialize(createState())
    renderer.update(createState({depthSource: '/next-depth.webp', source: '/next.webp'}))
    await flushPromises()
    const obsoleteFrame = [...frameCallbacks.values()][0]

    renderer.destroy()
    vi.clearAllMocks()
    obsoleteFrame?.(200)

    expect(transitionInstances[0].setProgress).not.toHaveBeenCalled()
  })

  it('should ignore duplicate requests and cancel a pending request when state returns current', async () => {
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
    vi.clearAllMocks()

    const next = createState({depthSource: '/next-depth.webp', source: '/next.webp'})
    renderer.update(next)
    renderer.update(next)
    expect(loadings[0].start).toHaveBeenCalledOnce()
    renderer.update(createState())

    expect(depthFilters[0].cancelDepthTransition).toHaveBeenCalled()
    expect(eyesInstances[0].setSceneReady).toHaveBeenLastCalledWith(true)
    expect(loadings[0].finishAfterPaint).toHaveBeenCalled()

    resolveNext?.([createLease('/next.webp'), createLease('/next-depth.webp')] as never)
    await flushPromises()
    expect(releaseTextureGroup).toHaveBeenCalledWith([
      createLease('/next.webp'),
      createLease('/next-depth.webp'),
    ])
  })
})
