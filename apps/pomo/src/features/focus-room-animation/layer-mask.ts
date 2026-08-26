import type {Texture} from 'pixi.js'

import {LayerMaskFilter} from './layer-mask-filter'
import type {PixiSceneLayerDefinition} from './layer-scene-definition'

export const createLayerMaskFilter = (
  definition: PixiSceneLayerDefinition,
  maskTextures: ReadonlyMap<string, Texture>,
  layerTexture: Texture,
) => {
  if (definition.maskSource === undefined) {
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
