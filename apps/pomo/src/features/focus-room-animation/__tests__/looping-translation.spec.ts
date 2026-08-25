import {expect, it, vi} from 'vitest'

import type {Container, Sprite} from 'pixi.js'

import type {PixiSceneLoopingTranslation} from '../layer-scene-definition'
import {applyLoopingTranslation} from '../looping-translation'

const createMotion = (fade?: PixiSceneLoopingTranslation['fade']): PixiSceneLoopingTranslation => ({
  fade,
  from: {x: -10, y: 5},
  kind: 'looping-translation',
  to: {x: 30, y: -15},
  travel: {maximumSeconds: 2, minimumSeconds: 1},
})

it('should interpolate position without fading by default', () => {
  const container = {position: {set: vi.fn()}} as unknown as Container
  const sprite = {alpha: 0} as Sprite

  applyLoopingTranslation(container, sprite, createMotion(), 0.25)

  expect(container.position.set).toHaveBeenCalledWith(0, 0)
  expect(sprite.alpha).toBe(1)
})

it.each([
  [0, 0.2],
  [0.5, 1],
  [1, 0.2],
] as const)('should ease edge fading at progress %s', (progress, expectedAlpha) => {
  const container = {position: {set: vi.fn()}} as unknown as Container
  const sprite = {alpha: 0} as Sprite

  applyLoopingTranslation(
    container,
    sprite,
    createMotion({edgeFraction: 0.25, minimumOpacity: 0.2}),
    progress,
  )

  expect(sprite.alpha).toBeCloseTo(expectedAlpha)
})
