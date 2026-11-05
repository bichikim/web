/** @vitest-environment node */
import {Sprite, Texture, TextureSource, Ticker} from 'pixi.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  PixiLayerScene,
  type PixiLayerSceneDefinition,
  type PixiLayerSceneState,
  type PixiSceneOpacityPulse,
} from '../layer-scene'
import {acquireTextureGroup} from '../texture-leases'

vi.mock('../texture-leases', () => ({acquireTextureGroup: vi.fn(), releaseTextureGroup: vi.fn()}))

const motion: PixiSceneOpacityPulse = {
  kind: 'opacity-pulse',
  maximumOpacity: 0.9,
  minimumOpacity: 0.1,
  phase: 0.75,
  transitionSeconds: 1,
  travel: {maximumSeconds: 6, minimumSeconds: 2},
}
const enabledState: PixiLayerSceneState = {
  animationEnabled: true,
  channels: {pulse: {opacity: 0.4, visible: true}},
}
let texture: Texture
const scenes: PixiLayerScene[] = []

beforeEach(() => {
  texture = new Texture({source: new TextureSource({height: 1, width: 1})})
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.mocked(acquireTextureGroup).mockImplementation(async (sources) =>
    sources.map((source) => ({release: vi.fn(), source, texture})),
  )
})

afterEach(() => {
  for (const scene of scenes) {
    scene.destroy()
  }
  scenes.length = 0
  texture.destroy(true)
  vi.restoreAllMocks()
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

const initializeScene = async (
  definition = motion,
  state = enabledState,
  random = vi.fn(() => 0),
) => {
  const add = vi.spyOn(Ticker.prototype, 'add')
  const sceneDefinition: PixiLayerSceneDefinition = {
    background: '#000000',
    height: 1,
    id: 'pulse-reset',
    layers: [
      {
        attachmentId: 'pulse',
        channel: 'pulse',
        id: 'pulse',
        motion: definition,
        opacity: 0.5,
        source: '/pulse.png',
      },
    ],
    width: 1,
  }
  const scene = new PixiLayerScene(sceneDefinition, {onRender: vi.fn(), random})
  scenes.push(scene)
  await scene.initialize(state)
  const layer = scene.getAttachment('pulse')!
  const sprite = layer.children[0]
  expect(sprite).toBeInstanceOf(Sprite)
  const ticker = add.mock.contexts[0]
  if (!(ticker instanceof Ticker)) {
    throw new Error('Expected the scene ticker to own the advance callback.')
  }
  const advance = add.mock.calls[0][0]
  const tick = (seconds: number) => {
    ticker.deltaMS = seconds * 1000
    advance(ticker)
  }
  return {layer, random, scene, sprite, tick}
}

describe('PixiLayerScene opacity pulse reset continuity', () => {
  it.each([
    {alpha: 0.5, sample: 0},
    {alpha: 0.1, sample: 0.5},
    {alpha: 0.1, sample: 1},
  ])(
    'should preserve alpha at a zero tick using sampled duration $sample',
    async ({alpha, sample}) => {
      const random = vi.fn(() => sample)
      const {sprite, tick} = await initializeScene(motion, enabledState, random)
      expect(sprite.alpha).toBeCloseTo(alpha, 12)
      expect(random).toHaveBeenCalledTimes(2)

      tick(0)

      expect(sprite.alpha).toBeCloseTo(alpha, 12)
      expect(random).toHaveBeenCalledTimes(2)
    },
  )

  it('should advance continuously from reset on a small tick', async () => {
    const {sprite, random, tick} = await initializeScene()
    const initial = sprite.alpha

    tick(0.01)

    expect(initial).toBeCloseTo(0.5, 12)
    expect(sprite.alpha).toBeGreaterThan(initial)
    expect(sprite.alpha - initial).toBeLessThan(0.02)
    expect(random).toHaveBeenCalledTimes(2)
  })

  it('should use the most recently sampled reset duration after stop and re-enable', async () => {
    const random = vi
      .fn(() => 1)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
    const {scene, sprite, tick} = await initializeScene(
      {...motion, phase: 0.875},
      enabledState,
      random,
    )
    expect(sprite.alpha).toBeCloseTo(0.5, 12)
    expect(random).toHaveBeenCalledTimes(2)

    scene.setAnimationEnabled(false)

    expect(sprite.alpha).toBeCloseTo(0.217157287525381, 12)
    expect(random).toHaveBeenCalledTimes(3)
    scene.setAnimationEnabled(true)
    tick(0)
    expect(sprite.alpha).toBeCloseTo(0.217157287525381, 12)
    expect(random).toHaveBeenCalledTimes(3)
  })

  it('should keep disabled-animation presentation consistent through update and re-enable', async () => {
    const random = vi
      .fn(() => 0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(1)
    const {scene, sprite, tick} = await initializeScene(
      motion,
      {...enabledState, animationEnabled: false},
      random,
    )
    expect(sprite.alpha).toBe(0.1)
    expect(random).toHaveBeenCalledTimes(3)
    scene.setAnimationEnabled(false)
    expect(random).toHaveBeenCalledTimes(3)

    scene.update({...enabledState, animationEnabled: false})

    expect(sprite.alpha).toBeCloseTo(0.5, 12)
    expect(random).toHaveBeenCalledTimes(4)
    scene.setAnimationEnabled(true)
    tick(0)
    expect(sprite.alpha).toBeCloseTo(0.5, 12)
    expect(random).toHaveBeenCalledTimes(4)
  })

  it('should retain channel visibility and opacity while resetting disabled motion', async () => {
    const {scene, layer, sprite, random, tick} = await initializeScene()
    expect(layer.alpha).toBeCloseTo(0.2)

    scene.update({animationEnabled: true, channels: {pulse: {opacity: 0.4, visible: false}}})

    expect(layer.visible).toBe(false)
    expect(layer.alpha).toBeCloseTo(0.2)
    expect(sprite.alpha).toBeCloseTo(0.5, 12)
    expect(random).toHaveBeenCalledTimes(4)
    scene.update(enabledState)
    tick(0)
    expect(layer.visible).toBe(true)
    expect(layer.alpha).toBeCloseTo(0.2)
    expect(sprite.alpha).toBeCloseTo(0.5, 12)
    expect(random).toHaveBeenCalledTimes(4)
  })

  it('should retain direction reversal and sampled-period count over a full cycle', async () => {
    const {sprite, random, tick} = await initializeScene({...motion, phase: 0})
    expect(sprite.alpha).toBe(0.1)

    tick(2)
    expect(sprite.alpha).toBe(0.9)
    expect(random).toHaveBeenCalledTimes(3)
    tick(0.5)
    expect(sprite.alpha).toBe(0.9)
    tick(1)
    expect(sprite.alpha).toBeCloseTo(0.5, 12)
    tick(0.5)
    expect(sprite.alpha).toBeCloseTo(0.1, 12)
    expect(random).toHaveBeenCalledTimes(4)
  })

  it('should reset to the forward direction after stopping a reversed pulse', async () => {
    const {scene, sprite, random, tick} = await initializeScene()
    tick(0.5)
    expect(sprite.alpha).toBe(0.9)

    scene.setAnimationEnabled(false)
    scene.setAnimationEnabled(true)
    tick(0)

    expect(sprite.alpha).toBeCloseTo(0.5, 12)
    tick(0.01)
    expect(sprite.alpha).toBeGreaterThan(0.5)
    expect(random).toHaveBeenCalledTimes(4)
  })
})
