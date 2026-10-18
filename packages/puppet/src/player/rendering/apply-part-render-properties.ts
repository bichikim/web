import {type ColorMatrix, ColorMatrixFilter, type MaskFilter} from 'pixi.js'
import type {ResolvedPartRenderProperties} from '../../deformation'
import type {RuntimePart} from './types'

const colorsEqual = (first: ReadonlyArray<number>, second: ReadonlyArray<number>) =>
  first.length === second.length && first.every((value, index) => value === second[index])

const createColorMatrix = (
  multiplyColor: readonly [number, number, number],
  screenColor: readonly [number, number, number],
): ColorMatrix => [
  multiplyColor[0] * (1 - screenColor[0]),
  0,
  0,
  0,
  screenColor[0],
  0,
  multiplyColor[1] * (1 - screenColor[1]),
  0,
  0,
  screenColor[1],
  0,
  0,
  multiplyColor[2] * (1 - screenColor[2]),
  0,
  screenColor[2],
  0,
  0,
  0,
  1,
  0,
]

export const applyPartRenderProperties = (
  properties: ResolvedPartRenderProperties,
  runtimePart: RuntimePart,
) => {
  runtimePart.mesh.alpha = properties.opacity
  runtimePart.mesh.blendMode = properties.blendMode

  const hasColorEffect =
    !colorsEqual(properties.multiplyColor, [1, 1, 1]) ||
    !colorsEqual(properties.screenColor, [0, 0, 0])
  const filters: Array<ColorMatrixFilter | MaskFilter> = []
  if (hasColorEffect) {
    const colorFilter = runtimePart.colorFilter ?? new ColorMatrixFilter()
    runtimePart.colorFilter = colorFilter
    colorFilter.matrix = createColorMatrix(properties.multiplyColor, properties.screenColor)
    colorFilter.blendMode = 'normal'
    filters.push(colorFilter)
  }
  if (runtimePart.mask !== undefined) {
    filters.push(runtimePart.mask.filter)
  }
  const composite = filters.at(-1)
  if (composite !== undefined) {
    // Blend the completed layer against the scene, never its transparent intermediate.
    runtimePart.mesh.blendMode = 'normal'
    composite.blendMode = properties.blendMode
  }
  runtimePart.mesh.filters = filters.length > 0 ? filters : null
}
