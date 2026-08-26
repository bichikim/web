import {Container, Sprite, Texture} from 'pixi.js'
import {describe, expect, it} from 'vitest'

import {applyRepeatedLayerMask, detachLayerMasks} from '../layer-mask'

describe('layer mask', () => {
  it('should explicitly detach the Pixi mask effect before scene destruction', () => {
    const sceneContainer = new Container()
    const layerContainer = new Container()
    const maskTexture = Texture.EMPTY

    applyRepeatedLayerMask(
      sceneContainer,
      layerContainer,
      {id: 'sky', maskSource: 'sky-mask.webp', repeat: 'horizontal', source: 'sky.webp'},
      new Map([['sky-mask.webp', maskTexture]]),
    )

    expect(layerContainer.mask).toBeInstanceOf(Sprite)
    detachLayerMasks([{container: layerContainer}])
    expect(layerContainer.mask).toBeUndefined()
  })

  it('should use a texture mask to preserve soft alpha edges', () => {
    const sceneContainer = new Container()
    const layerContainer = new Container()
    const maskTexture = Texture.EMPTY

    applyRepeatedLayerMask(
      sceneContainer,
      layerContainer,
      {id: 'sky', maskSource: 'sky-mask.webp', repeat: 'horizontal', source: 'sky.webp'},
      new Map([['sky-mask.webp', maskTexture]]),
    )

    expect(layerContainer.mask).toBeInstanceOf(Sprite)
  })

  it('should reject a missing texture mask', () => {
    expect(() =>
      applyRepeatedLayerMask(
        new Container(),
        new Container(),
        {id: 'sky', maskSource: 'sky-mask.webp', repeat: 'horizontal', source: 'sky.webp'},
        new Map(),
      ),
    ).toThrow('Missing layer mask texture: sky-mask.webp')
  })
})
