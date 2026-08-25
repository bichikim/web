import {describe, expect, it} from 'vitest'

import type {PixiLayerSceneDefinition} from '../layer-scene-definition'
import {validateTextureSizes} from '../texture-size-validation'

const createDefinition = (position?: {readonly x: number; readonly y: number}) =>
  ({
    background: '#000000',
    height: 100,
    id: 'scene',
    layers: [{id: 'layer', ...(position === undefined ? {} : {position}), source: 'layer.webp'}],
    width: 100,
  }) satisfies PixiLayerSceneDefinition

describe('texture size validation', () => {
  it('should allow a cropped texture when its stored position keeps it inside the scene', () => {
    const textures = [{source: 'layer.webp', texture: {height: 20, width: 30}}]

    expect(() => validateTextureSizes(createDefinition({x: 60, y: 70}), textures, 1)).not.toThrow()
  })

  it('should reject a cropped texture without a position', () => {
    const textures = [{source: 'layer.webp', texture: {height: 20, width: 30}}]

    expect(() => validateTextureSizes(createDefinition(), textures, 1)).toThrow(
      'Invalid layer texture dimensions for layer.webp: 30x20',
    )
  })

  it('should reject a positioned texture that extends beyond the scene', () => {
    const textures = [{source: 'layer.webp', texture: {height: 20, width: 30}}]

    expect(() => validateTextureSizes(createDefinition({x: 80, y: 90}), textures, 1)).toThrow(
      'Invalid layer texture dimensions for layer.webp: 30x20',
    )
  })

  it('should allow scene-sized textures and identify invalid mask textures', () => {
    expect(() =>
      validateTextureSizes(
        createDefinition(),
        [{source: 'scene.webp', texture: {height: 100, width: 100}}],
        1,
      ),
    ).not.toThrow()

    expect(() =>
      validateTextureSizes(
        createDefinition(),
        [
          {source: 'layer.webp', texture: {height: 100, width: 100}},
          {source: 'mask.webp', texture: {height: 20, width: 30}},
        ],
        1,
      ),
    ).toThrow('Invalid mask texture dimensions for mask.webp: 30x20')
  })
})
