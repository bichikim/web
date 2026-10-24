import {getTargetBindings} from './target-bindings'
import type {
  PuppetAlphaBlendMode,
  PuppetColor,
  PuppetDocument,
  PuppetPartBlendMode,
  PuppetSceneContainerNode,
  PuppetSceneDeformerNode,
  PuppetSceneGroupNode,
} from '../player/document'
import type {PuppetParameterValueMap} from './composition'
import {composeKeyedColorEffect} from './keyed-color-effect'

export interface ResolvedGroupRenderProperties {
  readonly alphaBlendMode: PuppetAlphaBlendMode
  readonly blendMode: PuppetPartBlendMode
  readonly clippingMaskIds: ReadonlyArray<string>
  readonly invertedMask: boolean
  readonly multiplyColor: PuppetColor
  readonly offscreen: boolean
  readonly opacity: number
  readonly screenColor: PuppetColor
}

/** Opacity and color effect `c · multiply · (1 − screen) + screen`. */
export interface PuppetColorEffect {
  readonly multiplyColor: PuppetColor
  readonly opacity: number
  readonly screenColor: PuppetColor
}

export const IDENTITY_COLOR_EFFECT: PuppetColorEffect = {
  multiplyColor: [1, 1, 1],
  opacity: 1,
  screenColor: [0, 0, 0],
}

export const getGroupRenderProperties = (
  group: PuppetSceneGroupNode,
): ResolvedGroupRenderProperties => ({
  alphaBlendMode: group.properties?.alphaBlendMode ?? 'over',
  blendMode: group.properties?.blendMode ?? 'normal',
  clippingMaskIds: group.properties?.clippingMaskIds ?? [],
  invertedMask: group.properties?.invertedMask ?? false,
  multiplyColor: group.properties?.multiplyColor ?? IDENTITY_COLOR_EFFECT.multiplyColor,
  offscreen: group.properties?.offscreen ?? false,
  opacity: group.properties?.opacity ?? IDENTITY_COLOR_EFFECT.opacity,
  screenColor: group.properties?.screenColor ?? IDENTITY_COLOR_EFFECT.screenColor,
})

/**
 * A deformer's opacity and colors as the properties of a plain group: it passes them to
 * everything inside it, as Cubism deformers do.
 */
export const getDeformerRenderProperties = (
  deformer: PuppetSceneDeformerNode,
): ResolvedGroupRenderProperties => ({
  alphaBlendMode: 'over',
  blendMode: 'normal',
  clippingMaskIds: [],
  invertedMask: false,
  multiplyColor: deformer.properties?.multiplyColor ?? IDENTITY_COLOR_EFFECT.multiplyColor,
  offscreen: false,
  opacity: deformer.properties?.opacity ?? IDENTITY_COLOR_EFFECT.opacity,
  screenColor: deformer.properties?.screenColor ?? IDENTITY_COLOR_EFFECT.screenColor,
})

export const getContainerRenderProperties = (
  node: PuppetSceneContainerNode,
): ResolvedGroupRenderProperties =>
  node.kind === 'group' ? getGroupRenderProperties(node) : getDeformerRenderProperties(node)

/** Rest properties with the opacity and colors keyed by bindings targeting the deformer. */
export const composeParameterDeformerProperties = (options: {
  readonly deformer: PuppetSceneDeformerNode
  readonly document: PuppetDocument
  readonly parameterValues?: PuppetParameterValueMap
}): ResolvedGroupRenderProperties =>
  composeKeyedColorEffect({
    bindings: getTargetBindings(
      options.document.parameterBindings ?? [],
      'targetDeformerIds',
      options.deformer.id,
    ),
    document: options.document,
    keyedProperties: (binding) =>
      binding.targetDeformerIds?.includes(options.deformer.id) === true
        ? binding.keyforms.map(
            (keyform) =>
              keyform.deformers?.find((candidate) => candidate.nodeId === options.deformer.id)
                ?.properties,
          )
        : undefined,
    parameterValues: options.parameterValues,
    rest: getDeformerRenderProperties(options.deformer),
  })

/** Rest properties with the opacity and colors keyed by bindings targeting the group. */
export const composeParameterGroupProperties = (options: {
  readonly document: PuppetDocument
  readonly group: PuppetSceneGroupNode
  readonly parameterValues?: PuppetParameterValueMap
}): ResolvedGroupRenderProperties =>
  composeKeyedColorEffect({
    bindings: getTargetBindings(
      options.document.parameterBindings ?? [],
      'targetGroupIds',
      options.group.id,
    ),
    document: options.document,
    keyedProperties: (binding) =>
      binding.targetGroupIds?.includes(options.group.id) === true
        ? binding.keyforms.map(
            (keyform) =>
              keyform.groups?.find((candidate) => candidate.groupId === options.group.id)
                ?.properties,
          )
        : undefined,
    parameterValues: options.parameterValues,
    rest: getGroupRenderProperties(options.group),
  })

const mapChannels = (map: (index: 0 | 1 | 2) => number): PuppetColor => [map(0), map(1), map(2)]

const scale = (effect: PuppetColorEffect, index: 0 | 1 | 2) =>
  effect.multiplyColor[index] * (1 - effect.screenColor[index])

/**
 * The single effect equal to applying `inner` and then `outer`. With scale `a = m (1 − s)` and
 * offset `s`, the result has `a = a_inner · a_outer` and `s = s_inner · a_outer + s_outer`.
 */
export const composeColorEffects = <Effect extends PuppetColorEffect>(
  inner: Effect,
  outer: PuppetColorEffect,
  composition?: 'cubism',
): Effect => {
  if (composition === 'cubism') {
    return {
      ...inner,
      multiplyColor: mapChannels(
        (index) => inner.multiplyColor[index] * outer.multiplyColor[index],
      ),
      opacity: inner.opacity * outer.opacity,
      screenColor: mapChannels(
        (index) => 1 - (1 - inner.screenColor[index]) * (1 - outer.screenColor[index]),
      ),
    }
  }
  const screenColor = mapChannels((index) =>
    Math.min(1, inner.screenColor[index] * scale(outer, index) + outer.screenColor[index]),
  )
  return {
    ...inner,
    // The multiply color has no effect once the screen color is white.
    multiplyColor: mapChannels((index) =>
      screenColor[index] < 1
        ? Math.min(1, (scale(inner, index) * scale(outer, index)) / (1 - screenColor[index]))
        : 1,
    ),
    opacity: inner.opacity * outer.opacity,
    screenColor,
  }
}
