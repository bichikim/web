import {describe, expect, it} from 'vitest'

import type {PixiSceneMotion} from '../layer-scene-definition'
import {validateSceneMotions} from '../motion-validation'

const SCENE_SIZE = {height: 941, width: 1672}

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
})
