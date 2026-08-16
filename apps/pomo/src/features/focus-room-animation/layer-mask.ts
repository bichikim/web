import {type Container, Sprite, type Texture} from 'pixi.js'

import type {PixiSceneLayerDefinition} from './layer-scene-definition'

export const applyLayerMask = (
  sceneContainer: Container,
  layerContainer: Container,
  definition: PixiSceneLayerDefinition,
  maskTextures: ReadonlyMap<string, Texture>,
) => {
  if (definition.maskSource === undefined) {
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
