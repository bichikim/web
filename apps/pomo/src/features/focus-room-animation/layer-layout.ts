import {Container} from 'pixi.js'

import type {PixiScenePivotRotation, PixiScenePoint} from './layer-scene-definition'

interface PositionLayerContainerOptions {
  readonly container: Container
  readonly pivotMotion?: PixiScenePivotRotation
  readonly position?: PixiScenePoint
  readonly rotationDegrees?: number
  readonly size: LayerSize
}

interface LayerSize {
  readonly height: number
  readonly width: number
}

const DEGREES_PER_HALF_TURN = 180

export const positionLayerContainer = (options: PositionLayerContainerOptions) => {
  if (options.pivotMotion !== undefined) {
    const position = options.position ?? {x: 0, y: 0}
    options.container.pivot.set(
      options.pivotMotion.center.x - position.x,
      options.pivotMotion.center.y - position.y,
    )
    options.container.position.set(options.pivotMotion.center.x, options.pivotMotion.center.y)
  } else if (options.position !== undefined) {
    const rotationRadians = ((options.rotationDegrees ?? 0) * Math.PI) / DEGREES_PER_HALF_TURN
    const pivotX = options.size.width / 2
    const pivotY = options.size.height / 2

    options.container.pivot.set(pivotX, pivotY)
    options.container.position.set(options.position.x + pivotX, options.position.y + pivotY)
    options.container.rotation = rotationRadians
  }
}
