import {type Container, Sprite, type Texture} from 'pixi.js'

import {LayerMaskFilter} from './layer-mask-filter'
import type {PixiSceneLayerDefinition} from './layer-scene-definition'

export const createLayerMaskFilter = (
  definition: PixiSceneLayerDefinition,
  maskTextures: ReadonlyMap<string, Texture>,
  layerTexture: Texture,
) => {
  if (definition.maskSource === undefined || definition.repeat === 'horizontal') {
    return null
  }

  const maskTexture = maskTextures.get(definition.maskSource)

  if (maskTexture === undefined) {
    throw new Error(`Missing layer mask texture: ${definition.maskSource}`)
  }

  if (maskTexture.width !== layerTexture.width || maskTexture.height !== layerTexture.height) {
    throw new Error(`Layer mask dimensions must match the layer: ${definition.maskSource}`)
  }

  return new LayerMaskFilter({maskTexture})
}

export const applyRepeatedLayerMask = (
  sceneContainer: Container,
  layerContainer: Container,
  definition: PixiSceneLayerDefinition,
  maskTextures: ReadonlyMap<string, Texture>,
) => {
  if (definition.maskSource === undefined || definition.repeat !== 'horizontal') {
    return
  }

  const maskTexture = maskTextures.get(definition.maskSource)

  if (maskTexture === undefined) {
    throw new Error(`Missing layer mask texture: ${definition.maskSource}`)
  }

  const maskSprite = new Sprite(maskTexture)
  sceneContainer.addChild(maskSprite)
  layerContainer.setMask({channel: 'red', mask: maskSprite})
}

export const detachLayerMasks = (layers: readonly {readonly container: Container}[]) => {
  for (const layer of layers) {
    layer.container.mask = null
  }
}
