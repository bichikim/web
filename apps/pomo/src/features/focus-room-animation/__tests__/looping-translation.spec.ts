import {Container, Sprite, Texture} from 'pixi.js'
import {describe, expect, it} from 'vitest'

import type {PixiSceneLoopingTranslation} from '../layer-scene-definition'
import {applyLoopingTranslation} from '../looping-translation'

const motion = {
  fade: {edgeFraction: 0.25, minimumOpacity: 0.1},
  from: {x: 0, y: 0},
  kind: 'looping-translation',
  to: {x: -300, y: 0},
  travel: {maximumSeconds: 10, minimumSeconds: 10},
} satisfies PixiSceneLoopingTranslation

describe('looping translation', () => {
  it('should move a regular sprite container', () => {
    const container = new Container()
    const sprite = new Sprite(Texture.EMPTY)

    applyLoopingTranslation(container, sprite, motion, 0.5)

    expect(container.position.x).toBe(-150)
    expect(sprite.alpha).toBe(1)
  })

  it('should fade near the loop boundary before reappearing', () => {
    const container = new Container()
    const sprite = new Sprite(Texture.EMPTY)

    applyLoopingTranslation(container, sprite, motion, 0)

    expect(sprite.alpha).toBe(0.1)
  })
})
