import type {
  PuppetAlphaBlendMode,
  PuppetColor,
  PuppetDocument,
  PuppetPart,
  PuppetPartBlendMode,
} from '../player/document'
import type {PuppetParameterValueMap} from './composition'
import {composeKeyedColorEffect} from './keyed-color-effect'

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

export const composeParameterPartProperties = (
  options: ComposeParameterPartPropertiesOptions,
): ResolvedPartRenderProperties => {
  const part = options.document.parts.find((candidate) => candidate.id === options.partId)
  if (part === undefined) {
    return DEFAULT_PROPERTIES
  }

  return composeKeyedColorEffect({
    document: options.document,
    keyedProperties: (binding) =>
      binding.targetPartIds?.includes(options.partId) === true
        ? binding.keyforms.map(
            (keyform) =>
              keyform.parts.find((candidate) => candidate.partId === options.partId)?.properties,
          )
        : undefined,
    parameterValues: options.parameterValues,
    rest: getPartRenderProperties(part),
  })
}
