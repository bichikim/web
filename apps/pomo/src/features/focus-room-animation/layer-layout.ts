import {Container} from 'pixi.js'

import type {
  PixiLayerSceneDefinition,
  PixiScenePivotRotation,
  PixiScenePoint,
} from './layer-scene-definition'
import type {TextureLease} from './texture-leases'

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

interface ValidateTextureSizesOptions {
  readonly definition: PixiLayerSceneDefinition
  readonly layerSourceCount: number
  readonly textures: readonly TextureLease[]
}

const DEGREES_PER_HALF_TURN = 180

export const positionLayerContainer = (options: PositionLayerContainerOptions) => {
  if (options.pivotMotion !== undefined) {
    options.container.pivot.set(options.pivotMotion.center.x, options.pivotMotion.center.y)
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

const isLayerWithinScene = (
  definition: PixiLayerSceneDefinition,
  position: PixiScenePoint,
  width: number,
  height: number,
) =>
  width > 0 &&
  height > 0 &&
  position.x >= 0 &&
  position.y >= 0 &&
  position.x + width <= definition.width &&
  position.y + height <= definition.height

export const validateTextureSizes = (options: ValidateTextureSizesOptions) => {
  for (const [index, lease] of options.textures.slice(0, options.layerSourceCount).entries()) {
    const {height, width} = lease.texture
    const layer = options.definition.layers[index]

    if (layer?.position === undefined) {
      if (width !== options.definition.width || height !== options.definition.height) {
        throw new Error(`Invalid layer texture dimensions for ${lease.source}: ${width}x${height}`)
      }
    } else if (!isLayerWithinScene(options.definition, layer.position, width, height)) {
      throw new Error(
        `Invalid positioned layer bounds for ${lease.source}: ${width}x${height} ` +
          `at ${layer.position.x},${layer.position.y}`,
      )
    }
  }
}
