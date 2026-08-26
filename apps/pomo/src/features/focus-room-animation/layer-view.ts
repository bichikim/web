import {Container, Sprite, type Texture} from 'pixi.js'

import type {PixiSceneLayerDefinition} from './layer-scene-definition'

export const createLayerView = (definition: PixiSceneLayerDefinition, texture: Texture) => {
  if (definition.repeat !== 'horizontal') {
    return new Sprite(texture)
  }

  const view = new Container()
  const firstSprite = new Sprite(texture)
  const secondSprite = new Sprite(texture)
  secondSprite.position.x = texture.width
  view.addChild(firstSprite, secondSprite)

  return view
}
