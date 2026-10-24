import {Container, Sprite, type Texture} from 'pixi.js'

import {applyRepeatedLayerMask} from './layer-mask'
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

interface AttachLayerViewOptions {
  readonly definition: PixiSceneLayerDefinition
  readonly layerContainer: Container
  readonly maskTextures: ReadonlyMap<string, Texture>
  readonly sceneContainer: Container
  readonly view: Container
}

export const attachLayerView = (options: AttachLayerViewOptions) => {
  options.layerContainer.addChild(options.view)
  if (options.definition.repeat === 'horizontal') {
    applyRepeatedLayerMask(
      options.sceneContainer,
      options.layerContainer,
      options.definition,
      options.maskTextures,
    )
  }
  options.sceneContainer.addChild(options.layerContainer)
}
