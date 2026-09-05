import {clamp} from 'es-toolkit/math'

import type {
  PuppetColor,
  PuppetDocument,
  PuppetParameterPartKeyform,
  PuppetPart,
  PuppetPartBlendMode,
} from '../player/document'
import {getParameterBindingValues, type PuppetParameterValueMap} from './composition'
import {sampleParameterCoordinates} from './parameter'

export interface ResolvedPartRenderProperties {
  readonly blendMode: PuppetPartBlendMode
  readonly clippingMaskIds: ReadonlyArray<string>
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
  blendMode: 'normal',
  clippingMaskIds: [],
  invertedMask: false,
  multiplyColor: [1, 1, 1],
  opacity: 1,
  renderWhenUsedAsMask: true,
  screenColor: [0, 0, 0],
}

const MULTIPLY_COLOR_START = 1
const SCREEN_COLOR_START = 4

const getInterpolatedCoordinates = (
  keyform: PuppetParameterPartKeyform | undefined,
  rest: ResolvedPartRenderProperties,
) => {
  const properties = keyform?.properties
  return properties === undefined
    ? undefined
    : [
        properties.opacity ?? rest.opacity,
        ...(properties.multiplyColor ?? rest.multiplyColor),
        ...(properties.screenColor ?? rest.screenColor),
      ]
}

const clampColor = (coordinates: ReadonlyArray<number>, start: number): PuppetColor => [
  clamp(coordinates[start] ?? 0, 0, 1),
  clamp(coordinates[start + 1] ?? 0, 0, 1),
  clamp(coordinates[start + 2] ?? 0, 0, 1),
]

export const getPartRenderProperties = (part: PuppetPart): ResolvedPartRenderProperties => ({
  blendMode: part.properties?.blendMode ?? DEFAULT_PROPERTIES.blendMode,
  clippingMaskIds: part.properties?.clippingMaskIds ?? DEFAULT_PROPERTIES.clippingMaskIds,
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

  const rest = getPartRenderProperties(part)
  const restCoordinates = [rest.opacity, ...rest.multiplyColor, ...rest.screenColor]
  let coordinates = restCoordinates

  for (const binding of options.document.parameterBindings ?? []) {
    if (binding.targetPartIds?.includes(options.partId) === true) {
      const sampled = sampleParameterCoordinates({
        binding,
        keyformCoordinates: binding.keyforms.map((keyform) =>
          getInterpolatedCoordinates(
            keyform.parts.find((candidate) => candidate.partId === options.partId),
            rest,
          ),
        ),
        restCoordinates,
        values: getParameterBindingValues({
          binding,
          document: options.document,
          parameterValues: options.parameterValues,
        }),
      })
      coordinates = coordinates.map(
        (coordinate, index) =>
          coordinate + (sampled[index] ?? restCoordinates[index]!) - restCoordinates[index]!,
      )
    }
  }

  return {
    ...rest,
    multiplyColor: clampColor(coordinates, MULTIPLY_COLOR_START),
    opacity: clamp(coordinates[0] ?? rest.opacity, 0, 1),
    screenColor: clampColor(coordinates, SCREEN_COLOR_START),
  }
}
