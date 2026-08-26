import {expect, it, vi} from 'vitest'

const pixiMocks = vi.hoisted(() => ({
  Sprite: class {
    constructor(readonly texture: unknown) {}
  },
}))

const motionMocks = vi.hoisted(() => ({applyLoopingTranslation: vi.fn()}))

vi.mock('pixi.js', () => ({Sprite: pixiMocks.Sprite}))
vi.mock('../looping-translation', () => motionMocks)

import type {Container, Sprite, Texture} from 'pixi.js'

import {applyLayerMask} from '../layer-mask'
import type {PixiSceneLayerDefinition, PixiSceneMotion} from '../layer-scene-definition'
import {resetMotionPresentation} from '../motion-reset'
import {applyOpacityPulse} from '../opacity-pulse'
import {applyVisibilityCycle} from '../visibility-cycle'

const createContainer = () => ({
  addChild: vi.fn(),
  position: {set: vi.fn()},
  rotation: 1,
  setMask: vi.fn(),
})

it('should skip, apply, and validate red-channel layer masks', () => {
  const scene = createContainer()
  const layer = createContainer()
  const texture = {id: 'mask'} as unknown as Texture
  const definition = {maskSource: 'mask.webp'} as PixiSceneLayerDefinition

  applyLayerMask(
    scene as unknown as Container,
    layer as unknown as Container,
    {} as PixiSceneLayerDefinition,
    new Map(),
  )
  expect(scene.addChild).not.toHaveBeenCalled()
  expect(() =>
    applyLayerMask(
      scene as unknown as Container,
      layer as unknown as Container,
      definition,
      new Map(),
    ),
  ).toThrow('Missing layer mask texture: mask.webp')

  applyLayerMask(
    scene as unknown as Container,
    layer as unknown as Container,
    definition,
    new Map([['mask.webp', texture]]),
  )
  const mask = scene.addChild.mock.calls[0][0]
  expect(mask).toBeInstanceOf(pixiMocks.Sprite)
  expect(layer.setMask).toHaveBeenCalledWith({channel: 'red', mask})
})

it('should reset every motion presentation kind', () => {
  const container = createContainer()
  const sprite = {alpha: 0, visible: false} as unknown as Sprite
  const common = {
    container: container as unknown as Container,
    currentTarget: {x: 7, y: 8},
    phase: 0.5,
    sprite,
  }
  const reset = (motion: object) =>
    resetMotionPresentation({...common, motion: motion as PixiSceneMotion})

  reset({center: {x: 3, y: 4}, kind: 'pivot-rotation'})
  expect(container.position.set).toHaveBeenCalledWith(3, 4)
  expect(container.rotation).toBe(0)
  reset({kind: 'translation'})
  expect(container.position.set).toHaveBeenCalledWith(7, 8)
  const looping = {kind: 'looping-translation'}
  reset(looping)
  expect(motionMocks.applyLoopingTranslation).toHaveBeenCalledWith(container, sprite, looping, 0.5)
  reset({kind: 'opacity-pulse', maximumOpacity: 0.8, minimumOpacity: 0.2})
  expect(sprite.alpha).toBeCloseTo(0.5)
  reset({kind: 'visibility-cycle', visibleFraction: 0.6})
  expect(sprite.visible).toBe(true)
})

it('should interpolate opacity and visibility at both sides of their thresholds', () => {
  const sprite = {alpha: 0, visible: false} as unknown as Sprite
  const opacity = {
    kind: 'opacity-pulse',
    maximumOpacity: 0.9,
    minimumOpacity: 0.1,
    travel: {maximumSeconds: 2, minimumSeconds: 1},
  } as const
  applyOpacityPulse(sprite, opacity, 0)
  expect(sprite.alpha).toBe(0.1)
  applyOpacityPulse(sprite, opacity, 1)
  expect(sprite.alpha).toBe(0.9)

  const visibility = {
    kind: 'visibility-cycle',
    travel: {maximumSeconds: 2, minimumSeconds: 1},
    visibleFraction: 0.25,
  } as const
  applyVisibilityCycle(sprite, visibility, 0.24)
  expect(sprite.visible).toBe(true)
  applyVisibilityCycle(sprite, visibility, 0.25)
  expect(sprite.visible).toBe(false)
})
