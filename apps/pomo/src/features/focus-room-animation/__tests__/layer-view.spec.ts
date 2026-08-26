import {Container, Sprite, Texture} from 'pixi.js'
import {describe, expect, it} from 'vitest'

import type {PixiSceneLayerDefinition} from '../layer-scene-definition'
import {attachLayerView, createLayerView} from '../layer-view'

const createDefinition = (repeat?: 'horizontal') =>
  ({
    id: 'sky',
    ...(repeat === undefined ? {} : {repeat}),
    source: 'sky.png',
  }) satisfies PixiSceneLayerDefinition

describe('layer view', () => {
  it('should create one sprite for a regular layer', () => {
    expect(createLayerView(createDefinition(), Texture.WHITE)).toBeInstanceOf(Sprite)
  })

  it('should place two identical sprites edge to edge for a horizontal repeat', () => {
    const view = createLayerView(createDefinition('horizontal'), Texture.WHITE)

    expect(view).toBeInstanceOf(Container)
    expect(view.children).toHaveLength(2)
    expect(view.children[0]).toBeInstanceOf(Sprite)
    expect(view.children[1]).toBeInstanceOf(Sprite)
    expect(view.children[0].position.x).toBe(0)
    expect(view.children[1].position.x).toBe(Texture.WHITE.width)
  })

  it('should attach the view and its repeated mask to the scene', () => {
    const sceneContainer = new Container()
    const layerContainer = new Container()
    const definition = {
      ...createDefinition('horizontal'),
      maskSource: 'mask.png',
    }
    const view = createLayerView(definition, Texture.WHITE)

    attachLayerView({
      definition,
      layerContainer,
      maskTextures: new Map([['mask.png', Texture.WHITE]]),
      sceneContainer,
      view,
    })

    expect(layerContainer.children).toContain(view)
    expect(layerContainer.mask).toBeInstanceOf(Sprite)
    expect(sceneContainer.children).toContain(layerContainer)
  })
})
