import {getTargetBindings} from './target-bindings'
import type {
  PuppetAlphaBlendMode,
  PuppetColor,
  PuppetDocument,
  PuppetPart,
  PuppetPartBlendMode,
} from '../player/document'
import type {PuppetParameterValueMap} from './composition'
import {type ColorEffectComposer, createColorEffectComposer} from './keyed-color-effect'

export interface ResolvedPartRenderProperties {
  readonly alphaBlendMode: PuppetAlphaBlendMode
  readonly blendMode: PuppetPartBlendMode
  readonly clippingMaskIds: ReadonlyArray<string>
  readonly culling: boolean
  readonly invertedMask: boolean
  readonly multiplyColor: PuppetColor
  readonly opacity: number
  readonly renderWhenUsedAsMask: boolean
  readonly screenColor: PuppetColor
}

export interface ComposeParameterPartPropertiesOptions {
  readonly document: PuppetDocument
  readonly parameterValues?: PuppetParameterValueMap
  readonly partId: string
}

const DEFAULT_PROPERTIES: ResolvedPartRenderProperties = {
  alphaBlendMode: 'over',
  blendMode: 'normal',
  clippingMaskIds: [],
  culling: false,
  invertedMask: false,
  multiplyColor: [1, 1, 1],
  opacity: 1,
  renderWhenUsedAsMask: true,
  screenColor: [0, 0, 0],
}

export const getPartRenderProperties = (part: PuppetPart): ResolvedPartRenderProperties => ({
  alphaBlendMode: part.properties?.alphaBlendMode ?? DEFAULT_PROPERTIES.alphaBlendMode,
  blendMode: part.properties?.blendMode ?? DEFAULT_PROPERTIES.blendMode,
  clippingMaskIds: part.properties?.clippingMaskIds ?? DEFAULT_PROPERTIES.clippingMaskIds,
  culling: part.properties?.culling ?? DEFAULT_PROPERTIES.culling,
  invertedMask: part.properties?.invertedMask ?? DEFAULT_PROPERTIES.invertedMask,
  multiplyColor: part.properties?.multiplyColor ?? DEFAULT_PROPERTIES.multiplyColor,
  opacity: part.properties?.opacity ?? DEFAULT_PROPERTIES.opacity,
  renderWhenUsedAsMask:
    part.properties?.renderWhenUsedAsMask ?? DEFAULT_PROPERTIES.renderWhenUsedAsMask,
  screenColor: part.properties?.screenColor ?? DEFAULT_PROPERTIES.screenColor,
})

const composers = new WeakMap<
  PuppetDocument,
  Map<string, ColorEffectComposer<ResolvedPartRenderProperties>>
>()

export const composeParameterPartProperties = (
  options: ComposeParameterPartPropertiesOptions,
): ResolvedPartRenderProperties => {
  let byPart = composers.get(options.document)
  const previous = byPart?.get(options.partId)
  if (previous !== undefined) {
    return previous(options.parameterValues)
  }
  const part = options.document.parts.find((candidate) => candidate.id === options.partId)
  if (part === undefined) {
    return DEFAULT_PROPERTIES
  }

  const compose = createColorEffectComposer({
    bindings: getTargetBindings(
      options.document.parameterBindings ?? [],
      'targetPartIds',
      options.partId,
    ),
    document: options.document,
    keyedProperties: (binding) =>
      binding.targetPartIds?.includes(options.partId) === true
        ? binding.keyforms.map(
            (keyform) =>
              keyform.parts.find((candidate) => candidate.partId === options.partId)?.properties,
          )
        : undefined,
    rest: getPartRenderProperties(part),
  })
  if (byPart === undefined) {
    byPart = new Map()
    composers.set(options.document, byPart)
  }
  byPart.set(options.partId, compose)
  return compose(options.parameterValues)
}
