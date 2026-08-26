import {describe, expect, it} from 'vitest'

import type {PixiSceneMotion} from '../layer-scene-definition'
import {validateSceneMotion, validateSceneMotions} from '../motion-validation'

const SCENE_SIZE = {height: 941, width: 1672}

const TRAVEL = {maximumSeconds: 2, minimumSeconds: 1}
const validTwinkle = {
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
} satisfies PixiSceneMotion

const expectInvalid = (motion: PixiSceneMotion, message: string) => {
  expect(() => validateSceneMotion('layer', motion, SCENE_SIZE)).toThrow(message)
}

describe('scene motion validation', () => {
  it('should reject multiple motions that overwrite the same sprite opacity', () => {
    const motions = [
      {
        kind: 'opacity-pulse',
        maximumOpacity: 1,
        minimumOpacity: 0,
        travel: {maximumSeconds: 4, minimumSeconds: 2},
      },
      {
        fall: {maximumSeconds: 0.6, minimumSeconds: 0.25},
        flashChance: 0.06,
        flashFall: {maximumSeconds: 0.32, minimumSeconds: 0.12},
        flashHold: {maximumSeconds: 0.12, minimumSeconds: 0.04},
        flashRise: {maximumSeconds: 0.14, minimumSeconds: 0.05},
        kind: 'opacity-twinkle',
        maximumOpacity: 1,
        minimumOpacity: 0,
        rise: {maximumSeconds: 0.25, minimumSeconds: 0.1},
        travel: {maximumSeconds: 6, minimumSeconds: 1.5},
      },
    ] satisfies readonly PixiSceneMotion[]

    expect(() => validateSceneMotions('stars', motions, SCENE_SIZE)).toThrow(
      'Layer cannot define multiple opacity motions: stars',
    )
  })

  it('should allow an opacity motion alongside a motion that does not change opacity', () => {
    const motions = [
      {
        kind: 'opacity-pulse',
        maximumOpacity: 1,
        minimumOpacity: 0,
        travel: {maximumSeconds: 4, minimumSeconds: 2},
      },
      {
        center: {x: 0, y: 0},
        degrees: 1,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 2, minimumSeconds: 1},
      },
    ] satisfies readonly PixiSceneMotion[]

    expect(() => validateSceneMotions('light', motions, SCENE_SIZE)).not.toThrow()
  })

  it('should allow a visibility cycle alongside a looping translation', () => {
    const motions = [
      {
        from: {x: 0, y: 10},
        kind: 'looping-translation',
        to: {x: 0, y: 0},
        travel: {maximumSeconds: 2, minimumSeconds: 2},
      },
      {
        kind: 'visibility-cycle',
        phase: 0.25,
        travel: {maximumSeconds: 1, minimumSeconds: 1},
        visibleFraction: 0.25,
      },
    ] satisfies readonly PixiSceneMotion[]

    expect(() => validateSceneMotions('steam', motions, SCENE_SIZE)).not.toThrow()
  })

  it('should reject an invalid visibility cycle fraction', () => {
    const motions = [
      {
        kind: 'visibility-cycle',
        travel: {maximumSeconds: 1, minimumSeconds: 1},
        visibleFraction: 0,
      },
    ] satisfies readonly PixiSceneMotion[]

    expect(() => validateSceneMotions('steam', motions, SCENE_SIZE)).toThrow(
      'Visibility cycle fraction must be in (0, 1]: steam',
    )
  })

  it('should validate travel and transition ranges', () => {
    expectInvalid(
      {
        center: {x: 0, y: 0},
        degrees: 1,
        kind: 'pivot-rotation',
        travel: {...TRAVEL, minimumSeconds: 0},
      },
      'Invalid motion travel range',
    )
    expectInvalid(
      {
        center: {x: 0, y: 0},
        degrees: 1,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 0.5, minimumSeconds: 1},
      },
      'Invalid motion travel range',
    )
    expectInvalid(
      {distance: {x: 1, y: 0}, kind: 'translation', transitionSeconds: 0, travel: TRAVEL},
      'Invalid motion transition',
    )
    expectInvalid(
      {
        kind: 'opacity-pulse',
        maximumOpacity: 1,
        minimumOpacity: 0,
        transitionSeconds: 1.1,
        travel: TRAVEL,
      },
      'Invalid motion transition',
    )
    expect(() =>
      validateSceneMotion(
        'layer',
        {distance: {x: 1, y: 0}, kind: 'translation', transitionSeconds: 1, travel: TRAVEL},
        SCENE_SIZE,
      ),
    ).not.toThrow()
  })

  it('should require distinct translation endpoints and valid looping options', () => {
    expectInvalid({kind: 'translation', targets: [], travel: TRAVEL}, 'distinct positions')
    expectInvalid(
      {
        kind: 'translation',
        targets: [
          {x: 0, y: 0},
          {x: 0, y: 0},
        ],
        travel: TRAVEL,
      },
      'distinct positions',
    )
    expect(() =>
      validateSceneMotion(
        'layer',
        {
          kind: 'translation',
          targets: [
            {x: 0, y: 0},
            {x: 1, y: 0},
          ],
          travel: TRAVEL,
        },
        SCENE_SIZE,
      ),
    ).not.toThrow()
    expectInvalid(
      {from: {x: 0, y: 0}, kind: 'looping-translation', to: {x: 0, y: 0}, travel: TRAVEL},
      'requires distinct positions',
    )
    expect(() =>
      validateSceneMotion(
        'layer',
        {from: {x: 0, y: 0}, kind: 'looping-translation', to: {x: 0, y: 1}, travel: TRAVEL},
        SCENE_SIZE,
      ),
    ).not.toThrow()
    for (const phase of [-0.1, 1]) {
      expectInvalid(
        {from: {x: 0, y: 0}, kind: 'looping-translation', phase, to: {x: 1, y: 0}, travel: TRAVEL},
        'phase must be',
      )
    }
  })

  it('should reject every invalid looping fade boundary', () => {
    const invalidFades = [
      {edgeFraction: 0, minimumOpacity: 0},
      {edgeFraction: 0.6, minimumOpacity: 0},
      {edgeFraction: 0.5, minimumOpacity: -0.1},
      {edgeFraction: 0.5, minimumOpacity: 1.1},
    ]
    for (const fade of invalidFades) {
      expectInvalid(
        {fade, from: {x: 0, y: 0}, kind: 'looping-translation', to: {x: 1, y: 0}, travel: TRAVEL},
        'Invalid looping translation fade',
      )
    }
    expect(() =>
      validateSceneMotions(
        'layer',
        [
          {
            fade: {edgeFraction: 0.5, minimumOpacity: 0},
            from: {x: 0, y: 0},
            kind: 'looping-translation',
            to: {x: 1, y: 0},
            travel: TRAVEL,
          },
        ],
        SCENE_SIZE,
      ),
    ).not.toThrow()
  })

  it('should reject every invalid opacity pulse boundary', () => {
    const invalidRanges = [
      {maximumOpacity: 1, minimumOpacity: -0.1},
      {maximumOpacity: 1.1, minimumOpacity: 0},
      {maximumOpacity: 0.5, minimumOpacity: 0.5},
    ]
    for (const range of invalidRanges) {
      expectInvalid(
        {kind: 'opacity-pulse', ...range, travel: TRAVEL},
        'Invalid opacity pulse range',
      )
    }
    for (const phase of [-0.1, 1]) {
      expectInvalid(
        {kind: 'opacity-pulse', maximumOpacity: 1, minimumOpacity: 0, phase, travel: TRAVEL},
        'phase must be',
      )
    }
  })

  it('should reject every invalid opacity twinkle boundary', () => {
    const invalidTwinkles: PixiSceneMotion[] = [
      {...validTwinkle, minimumOpacity: -0.1},
      {...validTwinkle, maximumOpacity: 1.1},
      {...validTwinkle, minimumOpacity: 1},
      {...validTwinkle, flashChance: 0},
      {...validTwinkle, flashChance: 0.5},
      {...validTwinkle, rise: {...TRAVEL, minimumSeconds: 0}},
      {...validTwinkle, rise: {maximumSeconds: 0.5, minimumSeconds: 1}},
      {...validTwinkle, fall: {...TRAVEL, minimumSeconds: 0}},
      {...validTwinkle, fall: {maximumSeconds: 0.5, minimumSeconds: 1}},
      {...validTwinkle, flashRise: {...TRAVEL, minimumSeconds: 0}},
      {...validTwinkle, flashRise: {maximumSeconds: 0.5, minimumSeconds: 1}},
      {...validTwinkle, flashHold: {...TRAVEL, minimumSeconds: 0}},
      {...validTwinkle, flashHold: {maximumSeconds: 0.5, minimumSeconds: 1}},
      {...validTwinkle, flashFall: {...TRAVEL, minimumSeconds: 0}},
      {...validTwinkle, flashFall: {maximumSeconds: 0.5, minimumSeconds: 1}},
    ]
    for (const motion of invalidTwinkles) {
      expectInvalid(motion, 'Invalid opacity twinkle configuration')
    }
    expect(() => validateSceneMotion('layer', validTwinkle, SCENE_SIZE)).not.toThrow()
  })

  it('should validate visibility phase and pixel effects', () => {
    expectInvalid(
      {kind: 'visibility-cycle', travel: TRAVEL, visibleFraction: 1.1},
      'fraction must be',
    )
    for (const phase of [-0.1, 1]) {
      expectInvalid(
        {kind: 'visibility-cycle', phase, travel: TRAVEL, visibleFraction: 1},
        'phase must be',
      )
    }
    expectInvalid({effects: [], kind: 'pixel-oscillation', travel: TRAVEL}, 'requires an effect')

    const validPush = {
      distance: {x: 1, y: 0},
      featherPixels: 0,
      kind: 'pixel-push' as const,
      region: {height: 10, width: 10, x: 0, y: 0},
    }
    const invalidPushes = [
      {...validPush, region: {...validPush.region, width: 0}},
      {...validPush, region: {...validPush.region, height: 0}},
      {...validPush, featherPixels: -1},
      {...validPush, region: {...validPush.region, x: -1}},
      {...validPush, region: {...validPush.region, y: -1}},
      {...validPush, region: {...validPush.region, width: SCENE_SIZE.width + 1}},
      {...validPush, region: {...validPush.region, height: SCENE_SIZE.height + 1}},
    ]
    for (const effect of invalidPushes) {
      expectInvalid(
        {effects: [effect], kind: 'pixel-oscillation', travel: TRAVEL},
        'Invalid pixel-push region',
      )
    }
    expect(() =>
      validateSceneMotion(
        'layer',
        {
          center: {x: 0, y: 0},
          degrees: 1,
          kind: 'pivot-rotation',
          pixelPush: [
            validPush,
            {distance: {x: 1, y: 0}, kind: 'masked-pixel-push', maskSource: 'mask.png'},
          ],
          travel: TRAVEL,
        },
        SCENE_SIZE,
      ),
    ).not.toThrow()
  })
})
