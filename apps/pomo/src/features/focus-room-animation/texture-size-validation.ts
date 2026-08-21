import type {PixiLayerSceneDefinition} from './layer-scene-definition'

interface TextureSizeLease {
  readonly source: string
  readonly texture: {
    readonly height: number
    readonly width: number
  }
}

export const validateTextureSizes = (
  definition: PixiLayerSceneDefinition,
  textures: readonly TextureSizeLease[],
  layerSourceCount: number,
) => {
  for (const [index, lease] of textures.entries()) {
    const {height, width} = lease.texture
    const position = definition.layers[index]?.position
    const isValidPositionedLayer =
      position !== undefined &&
      width > 0 &&
      height > 0 &&
      position.x >= 0 &&
      position.y >= 0 &&
      position.x + width <= definition.width &&
      position.y + height <= definition.height

    if (!isValidPositionedLayer && (width !== definition.width || height !== definition.height)) {
      const sourceKind = index < layerSourceCount ? 'layer' : 'mask'
      throw new Error(
        `Invalid ${sourceKind} texture dimensions for ${lease.source}: ${width}x${height}`,
      )
    }
  }
}
