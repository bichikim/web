import {Container, Sprite, Texture} from 'pixi.js'
import {describe, expect, it} from 'vitest'

import {applyLayerMask, clearLayerMask} from '../layer-mask'

describe('layer mask', () => {
  it('should explicitly detach the Pixi mask effect before scene destruction', () => {
    const sceneContainer = new Container()
    const layerContainer = new Container()
    const maskTexture = Texture.EMPTY

    applyLayerMask(
      sceneContainer,
      layerContainer,
      {id: 'sky', maskSource: 'sky-mask.webp', source: 'sky.webp'},
      new Map([['sky-mask.webp', maskTexture]]),
    )

    expect(layerContainer.mask).toBeInstanceOf(Sprite)
    clearLayerMask(layerContainer)
    expect(layerContainer.mask).toBeUndefined()
  })

  it('should use a texture mask to preserve soft alpha edges', () => {
    const sceneContainer = new Container()
    const layerContainer = new Container()
    const maskTexture = Texture.EMPTY

    applyLayerMask(
      sceneContainer,
      layerContainer,
      {id: 'sky', maskSource: 'sky-mask.webp', source: 'sky.webp'},
      new Map([['sky-mask.webp', maskTexture]]),
    )

    expect(layerContainer.mask).toBeInstanceOf(Sprite)
  })

  it('should reject a missing texture mask', () => {
    expect(() =>
      applyLayerMask(
        new Container(),
        new Container(),
        {id: 'sky', maskSource: 'sky-mask.webp', source: 'sky.webp'},
        new Map(),
      ),
    ).toThrow('Missing layer mask texture: sky-mask.webp')
  })
})
