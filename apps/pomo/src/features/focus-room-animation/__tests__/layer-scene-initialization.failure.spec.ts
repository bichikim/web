import {Container, Sprite, Ticker} from 'pixi.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {PixiLayerScene, type PixiLayerSceneDefinition} from '../layer-scene'
import {LayerMaskFilter} from '../layer-mask-filter'
import {createPushFilter, createPushFilters} from '../push-filter-factory'
import {createSceneEffects} from '../scene-effect'
import {acquireTextureGroup, releaseTextureGroup} from '../texture-leases'

vi.mock('pixi.js', () => ({Container: vi.fn(), Sprite: vi.fn(), Ticker: vi.fn()}))
vi.mock('../layer-mask-filter', () => ({LayerMaskFilter: vi.fn()}))
vi.mock('../push-filter-factory', () => ({createPushFilter: vi.fn(), createPushFilters: vi.fn()}))
vi.mock('../scene-effect', () => ({createSceneEffects: vi.fn()}))
vi.mock('../texture-leases', () => ({acquireTextureGroup: vi.fn(), releaseTextureGroup: vi.fn()}))

const createFilter = () => ({destroy: vi.fn(), setProgress: vi.fn()})
const motionFilter = createFilter()
const stateFilter = createFilter()
const maskFilter = createFilter()
const containerDestroy = vi.fn()
const effectsDestroy = vi.fn()
const tickerDestroy = vi.fn()
const attachBefore = vi.fn()
const leases = [
  {source: '/layer.png', texture: {height: 100, width: 200}},
  {source: '/mask.png', texture: {height: 100, width: 200}},
]
const pushEffect = {
  distance: {x: 1, y: 1},
  kind: 'masked-pixel-push',
  maskSource: '/mask.png',
} as const
const definition: PixiLayerSceneDefinition = {
  background: '#fff',
  height: 100,
  id: 'failure',
  layers: [
    {
      id: 'layer',
      maskSource: '/mask.png',
      motion: {
        effects: [pushEffect],
        kind: 'pixel-oscillation',
        travel: {maximumSeconds: 1, minimumSeconds: 1},
      },
      source: '/layer.png',
      statePixelPush: {channel: 'state', effect: pushEffect},
    },
  ],
  width: 200,
}

beforeEach(() => {
  vi.mocked(Container).mockImplementation(function MockContainer() {
    const children: unknown[] = []
    return {
      addChild: vi.fn((child) => children.push(child)),
      children,
      destroy: containerDestroy,
      pivot: {set: vi.fn()},
      position: {set: vi.fn()},
    } as never
  })
  vi.mocked(Sprite).mockImplementation(function MockSprite(texture) {
    return {filters: null, texture} as never
  })
  vi.mocked(Ticker).mockImplementation(function MockTicker() {
    return {add: vi.fn(), destroy: tickerDestroy, start: vi.fn(), stop: vi.fn()} as never
  })
  vi.mocked(createPushFilters).mockReturnValue([motionFilter] as never)
  vi.mocked(createPushFilter).mockReturnValue(stateFilter as never)
  vi.mocked(LayerMaskFilter).mockImplementation(function MockLayerMaskFilter() {
    return maskFilter as never
  })
  vi.mocked(acquireTextureGroup).mockResolvedValue(leases as never)
  vi.mocked(createSceneEffects).mockReturnValue({
    advance: vi.fn(),
    attachBefore,
    attachTrailing: vi.fn(),
    destroy: effectsDestroy,
    hasMotion: false,
    setAnimationEnabled: vi.fn(),
  })
})

afterEach(() => {
  vi.resetAllMocks()
})

describe('PixiLayerScene failed initialization cleanup', () => {
  it('should destroy motion and state filters when actual layer mask dimensions differ', async () => {
    vi.mocked(acquireTextureGroup).mockResolvedValueOnce([
      leases[0],
      {source: '/mask.png', texture: {height: 100, width: 199}},
    ] as never)
    const scene = new PixiLayerScene(definition, {onRender: vi.fn()})

    await expect(scene.initialize({animationEnabled: false})).rejects.toThrow(
      'Layer mask dimensions must match the layer',
    )

    expect(motionFilter.destroy).toHaveBeenCalledOnce()
    expect(stateFilter.destroy).toHaveBeenCalledOnce()
    expect(releaseTextureGroup).toHaveBeenCalledOnce()
    scene.destroy()
    expect(releaseTextureGroup).toHaveBeenCalledOnce()
  })

  it('should destroy completed motion filters when state filter creation fails', async () => {
    const failure = new Error('state filter failed')
    vi.mocked(createPushFilter).mockImplementationOnce(() => {
      throw failure
    })
    const scene = new PixiLayerScene(definition, {onRender: vi.fn()})

    await expect(scene.initialize({animationEnabled: false})).rejects.toBe(failure)

    expect(motionFilter.destroy).toHaveBeenCalledOnce()
    expect(releaseTextureGroup).toHaveBeenCalledExactlyOnceWith(leases)
  })

  it('should destroy current motion filters when its state creation throws', async () => {
    const failure = new Error('random failed')
    const scene = new PixiLayerScene(definition, {
      onRender: vi.fn(),
      random: () => {
        throw failure
      },
    })

    await expect(scene.initialize({animationEnabled: false})).rejects.toBe(failure)

    expect(motionFilter.destroy).toHaveBeenCalledOnce()
    expect(releaseTextureGroup).toHaveBeenCalledExactlyOnceWith(leases)
  })

  it('should destroy every pending filter when attachment fails before layer registration', async () => {
    const failure = new Error('attachment failed')
    attachBefore.mockImplementationOnce(() => {
      throw failure
    })
    const scene = new PixiLayerScene(definition, {onRender: vi.fn()})

    await expect(scene.initialize({animationEnabled: false})).rejects.toBe(failure)

    expect(motionFilter.destroy).toHaveBeenCalledOnce()
    expect(stateFilter.destroy).toHaveBeenCalledOnce()
    expect(maskFilter.destroy).toHaveBeenCalledOnce()
    expect(releaseTextureGroup).toHaveBeenCalledExactlyOnceWith(leases)
  })

  it('should preserve initialization failure and finish cleanup when a pending filter throws', async () => {
    const failure = new Error('layer mask failed')
    const cleanup = new Error('motion cleanup failed')
    vi.mocked(LayerMaskFilter).mockImplementationOnce(function FailedLayerMaskFilter() {
      throw failure
    })
    motionFilter.destroy.mockImplementationOnce(() => {
      throw cleanup
    })
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const scene = new PixiLayerScene(definition, {onRender: vi.fn()})
    try {
      await expect(scene.initialize({animationEnabled: false})).rejects.toBe(failure)
      expect(motionFilter.destroy).toHaveBeenCalledOnce()
      expect(stateFilter.destroy).toHaveBeenCalledOnce()
      expect(effectsDestroy).toHaveBeenCalledOnce()
      expect(releaseTextureGroup).toHaveBeenCalledExactlyOnceWith(leases)
      expect(diagnostic).toHaveBeenCalledWith(expect.any(String), cleanup)
      scene.destroy()
      expect(releaseTextureGroup).toHaveBeenCalledOnce()
    } finally {
      diagnostic.mockRestore()
    }
  })

  it('should finish registered cleanup and release leases once when a filter destroy throws', async () => {
    const cleanup = new Error('mask cleanup failed')
    const scene = new PixiLayerScene(definition, {onRender: vi.fn()})
    await scene.initialize({animationEnabled: false})
    maskFilter.destroy.mockImplementationOnce(() => {
      throw cleanup
    })

    expect(() => scene.destroy()).toThrow(cleanup)

    expect(maskFilter.destroy).toHaveBeenCalledOnce()
    expect(stateFilter.destroy).toHaveBeenCalledOnce()
    expect(motionFilter.destroy).toHaveBeenCalledOnce()
    expect(effectsDestroy).toHaveBeenCalledOnce()
    expect(containerDestroy).toHaveBeenCalledOnce()
    expect(releaseTextureGroup).toHaveBeenCalledExactlyOnceWith(leases)
    scene.destroy()
    expect(releaseTextureGroup).toHaveBeenCalledOnce()
  })
})
