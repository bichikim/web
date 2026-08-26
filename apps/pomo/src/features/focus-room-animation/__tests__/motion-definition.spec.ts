import {describe, expect, it} from 'vitest'

import type {
  PixiSceneLayerDefinition,
  PixiSceneMotion,
  PixiScenePushEffect,
  PixiSceneTravelRange,
} from '../layer-scene-definition'
import {getLayerMotions, getMotionEffects} from '../motion-definition'

const TRAVEL = {
  maximumSeconds: 2,
  minimumSeconds: 1,
} satisfies PixiSceneTravelRange

const PIXEL_PUSH = {
  distance: {x: 1, y: 0},
  featherPixels: 2,
  kind: 'pixel-push',
  region: {height: 4, width: 3, x: 0, y: 0},
} satisfies PixiScenePushEffect

const PIVOT_ROTATION = {
  center: {x: 0, y: 0},
  degrees: 2,
  kind: 'pivot-rotation',
  pixelPush: [PIXEL_PUSH],
  travel: TRAVEL,
} satisfies PixiSceneMotion

const PIXEL_OSCILLATION = {
  effects: [PIXEL_PUSH],
  kind: 'pixel-oscillation',
  travel: TRAVEL,
} satisfies PixiSceneMotion

const MOTIONS_WITHOUT_EFFECTS = [
  {
    from: {x: 0, y: 0},
    kind: 'looping-translation',
    to: {x: 1, y: 0},
    travel: TRAVEL,
  },
  {
    kind: 'opacity-pulse',
    maximumOpacity: 1,
    minimumOpacity: 0,
    travel: TRAVEL,
  },
  {
    fall: TRAVEL,
    flashChance: 0.1,
    flashFall: TRAVEL,
    flashHold: TRAVEL,
    flashRise: TRAVEL,
    kind: 'opacity-twinkle',
    maximumOpacity: 1,
    minimumOpacity: 0,
    rise: TRAVEL,
    travel: TRAVEL,
  },
  {
    distance: {x: 1, y: 0},
    kind: 'translation',
    travel: TRAVEL,
  },
  {
    kind: 'visibility-cycle',
    travel: TRAVEL,
    visibleFraction: 0.5,
  },
] satisfies readonly PixiSceneMotion[]

const LAYER = {
  id: 'layer',
  source: '/layer.png',
} satisfies PixiSceneLayerDefinition

describe('getLayerMotions', () => {
  it('should prefer the singular motion definition', () => {
    expect(
      getLayerMotions({
        ...LAYER,
        motion: PIVOT_ROTATION,
        motions: [PIXEL_OSCILLATION],
      }),
    ).toEqual([PIVOT_ROTATION])
  })

  it('should return the plural motion definitions when no singular motion exists', () => {
    const motions = [PIVOT_ROTATION, PIXEL_OSCILLATION]

    expect(getLayerMotions({...LAYER, motions})).toBe(motions)
  })

  it('should return an empty collection when a layer has no motion', () => {
    expect(getLayerMotions(LAYER)).toEqual([])
  })
})

describe('getMotionEffects', () => {
  it('should return pivot-rotation pixel-push effects', () => {
    expect(getMotionEffects(PIVOT_ROTATION)).toBe(PIVOT_ROTATION.pixelPush)
  })

  it('should return an empty collection for a pivot rotation without pixel-push effects', () => {
    expect(
      getMotionEffects({
        center: {x: 0, y: 0},
        degrees: 2,
        kind: 'pivot-rotation',
        travel: TRAVEL,
      }),
    ).toEqual([])
  })

  it('should return pixel-oscillation effects', () => {
    expect(getMotionEffects(PIXEL_OSCILLATION)).toBe(PIXEL_OSCILLATION.effects)
  })

  it.each(MOTIONS_WITHOUT_EFFECTS)('should return no effects for $kind motions', (motion) => {
    expect(getMotionEffects(motion)).toEqual([])
  })

  it('should reject an unsupported runtime motion kind', () => {
    expect(() => getMotionEffects('unsupported-motion' as unknown as PixiSceneMotion)).toThrowError(
      'Unsupported scene motion: unsupported-motion',
    )
  })
})
