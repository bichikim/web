import {Container} from 'pixi.js'
import {describe, expect, it} from 'vitest'

import {positionLayerContainer} from '../layer-layout'

describe('positionLayerContainer', () => {
  it('should preserve a positioned layer origin around a scene-space rotation center', () => {
    const container = new Container()

    positionLayerContainer({
      container,
      pivotMotion: {
        center: {x: 1060, y: 425},
        degrees: 0.5,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 2.4, minimumSeconds: 1.5},
      },
      position: {x: 809, y: 127},
      size: {height: 381, width: 466},
    })

    expect({x: container.pivot.x, y: container.pivot.y}).toEqual({x: 251, y: 298})
    expect({x: container.position.x, y: container.position.y}).toEqual({x: 1060, y: 425})
  })

  it('should keep full-scene pivot coordinates unchanged without a layer position', () => {
    const container = new Container()

    positionLayerContainer({
      container,
      pivotMotion: {
        center: {x: 1060, y: 425},
        degrees: 0.5,
        kind: 'pivot-rotation',
        travel: {maximumSeconds: 2.4, minimumSeconds: 1.5},
      },
      size: {height: 941, width: 1672},
    })

    expect({x: container.pivot.x, y: container.pivot.y}).toEqual({x: 1060, y: 425})
    expect({x: container.position.x, y: container.position.y}).toEqual({x: 1060, y: 425})
  })
})
