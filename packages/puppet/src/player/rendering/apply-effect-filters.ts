import {type BLEND_MODES, type ColorMatrix, ColorMatrixFilter, type Filter} from 'pixi.js'
import type {ResolvedPartRenderProperties} from '../../deformation'
import type {PuppetAlphaBlendMode, PuppetPartBlendMode} from '../document'
import type {LayerRenderPlan} from '../internal/render-plan'
import {createPartBlendFilter, usesBackdropBlend} from './part-blend-filter'
import type {RuntimeEffects, RuntimeLayer, RuntimePart} from './types'

const colorsEqual = (first: ReadonlyArray<number>, second: ReadonlyArray<number>) =>
  first.length === second.length && first.every((value, index) => value === second[index])

const createColorMatrix = (
  multiplyColor: readonly [number, number, number],
  screenColor: readonly [number, number, number],
  opacity = 1,
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
  opacity,
  0,
]

interface ComposeEffectFiltersOptions {
  readonly alphaBlendMode: PuppetAlphaBlendMode
  readonly blendMode: PuppetPartBlendMode
  /** Omitted when the colors have no effect. */
  readonly colorMatrix?: ColorMatrix
  readonly target: RuntimeEffects
}

/**
 * Filters drawing the target with its color effect, mask and blend mode, and the blend mode the
 * target itself then needs.
 */
const composeEffectFilters = (options: ComposeEffectFiltersOptions) => {
  const {target} = options
  const filters: Array<Filter> = []
  if (options.colorMatrix !== undefined) {
    const colorFilter = target.colorFilter ?? new ColorMatrixFilter()
    target.colorFilter = colorFilter
    colorFilter.matrix = options.colorMatrix
    filters.push(colorFilter)
  }
  if (target.mask !== undefined) {
    filters.push(target.mask.filter)
  }
  // 재사용되는 필터에는 이전 프레임의 합성 모드가 남아 있으므로, 합성 필터만 다시 지정하도록 모두
  // 'normal'로 되돌린다. 그대로 두면 투명하게 지워진 중간 패스에 이전 모드가 적용된다.
  for (const filter of filters) {
    filter.blendMode = 'normal'
  }
  if (usesBackdropBlend(options.blendMode, options.alphaBlendMode)) {
    const blendFilter = target.blendFilter ?? createPartBlendFilter()
    target.blendFilter = blendFilter
    blendFilter.setModes(options.blendMode, options.alphaBlendMode)
    filters.push(blendFilter.filter)
    return {blendMode: 'normal' as const, filters}
  }
  const composite = filters.at(-1)
  if (composite === undefined) {
    return {blendMode: options.blendMode as BLEND_MODES, filters}
  }
  // Blend the completed layer against the scene, never its transparent intermediate.
  composite.blendMode = options.blendMode as BLEND_MODES
  return {blendMode: 'normal' as const, filters}
}

export const applyPartRenderProperties = (
  properties: ResolvedPartRenderProperties,
  runtimePart: RuntimePart,
) => {
  const hasColorEffect =
    !colorsEqual(properties.multiplyColor, [1, 1, 1]) ||
    !colorsEqual(properties.screenColor, [0, 0, 0])
  const {blendMode, filters} = composeEffectFilters({
    alphaBlendMode: properties.alphaBlendMode,
    blendMode: properties.blendMode,
    colorMatrix: hasColorEffect
      ? createColorMatrix(properties.multiplyColor, properties.screenColor)
      : undefined,
    target: runtimePart,
  })
  runtimePart.mesh.alpha = properties.opacity
  runtimePart.mesh.blendMode = blendMode
  runtimePart.mesh.filters = filters.length > 0 ? filters : null
}

/**
 * The layer's filters isolate its content: the color matrix, which also applies the opacity, is
 * always present so the members never blend with what lies behind the layer.
 */
export const applyLayerRenderProperties = (
  properties: LayerRenderPlan['properties'],
  runtimeLayer: RuntimeLayer,
) => {
  const {blendMode, filters} = composeEffectFilters({
    alphaBlendMode: properties.alphaBlendMode,
    blendMode: properties.blendMode,
    colorMatrix: createColorMatrix(
      properties.multiplyColor,
      properties.screenColor,
      properties.opacity,
    ),
    target: runtimeLayer,
  })
  runtimeLayer.container.blendMode = blendMode
  runtimeLayer.container.filters = filters
}
