/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createRendererMocks, createState, layerDefinition} from './support/renderer'

import {PSceneRenderer} from '../scene-renderer'

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
const {applications, depthFilters, layerScenes, loadings, parallaxInstances} = mocks

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
    const renderLayer = mocks.callbacks.layerRender
    renderLayer?.()

    expect(layerScenes[0].destroy).toHaveBeenCalled()
    expect(layerScenes[1].destroy).toHaveBeenCalled()
    expect(depthFilters[0].destroy).toHaveBeenCalled()
    expect(parallaxInstances[0].destroy).toHaveBeenCalled()
    expect(loadings[0].destroy).toHaveBeenCalled()
    expect(applications[0].destroy).toHaveBeenCalledWith(true)
    expect(applications[0].render).toHaveBeenCalledTimes(renderBeforeDestroy)
  })
})
