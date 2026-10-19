import {clamp} from 'es-toolkit/math'

import type {PuppetColor, PuppetDocument, PuppetParameterBinding} from '../player/document'
import {getRepeatRanges} from '../player/parameter-value'
import {getParameterBindingValues, type PuppetParameterValueMap} from './composition'
import type {PuppetColorEffect} from './group-properties'
import {getBindingInfluence} from './influence'
import {sampleParameterCoordinates} from './parameter'

const MULTIPLY_COLOR_START = 1
const SCREEN_COLOR_START = 4

export interface ComposeKeyedColorEffectOptions<Effect extends PuppetColorEffect> {
  readonly document: PuppetDocument
  /**
   * Keyed properties per keyform of a binding that targets the subject, or `undefined` for a
   * binding that does not. A keyform without properties keeps the rest values.
   */
  readonly keyedProperties: (
    binding: PuppetParameterBinding,
  ) => ReadonlyArray<Partial<PuppetColorEffect> | undefined> | undefined
  readonly parameterValues?: PuppetParameterValueMap
  readonly rest: Effect
}

/** Whether the properties key opacity or a color, the values this module interpolates. */
const keysColorEffect = (properties: Partial<PuppetColorEffect> | undefined) =>
  properties?.opacity !== undefined ||
  properties?.multiplyColor !== undefined ||
  properties?.screenColor !== undefined

/** Opacity, multiply color and screen color as one interpolation vector. */
export const toColorEffectCoordinates = (effect: PuppetColorEffect) => [
  effect.opacity,
  ...effect.multiplyColor,
  ...effect.screenColor,
]

const clampColor = (coordinates: ReadonlyArray<number>, start: number): PuppetColor => [
  clamp(coordinates[start] ?? 0, 0, 1),
  clamp(coordinates[start + 1] ?? 0, 0, 1),
  clamp(coordinates[start + 2] ?? 0, 0, 1),
]

/** The inverse of {@link toColorEffectCoordinates}, limited to 0..1. */
export const fromColorEffectCoordinates = (
  coordinates: ReadonlyArray<number>,
): PuppetColorEffect => ({
  multiplyColor: clampColor(coordinates, MULTIPLY_COLOR_START),
  opacity: clamp(coordinates[0] ?? 1, 0, 1),
  screenColor: clampColor(coordinates, SCREEN_COLOR_START),
})

/**
 * Rest opacity and colors moved by every targeting binding: each adds its sampled keyform
 * offset from the rest values, weighted by its influence, and the sum is limited to 0..1.
 */
export const composeKeyedColorEffect = <Subject extends PuppetColorEffect>(
  options: ComposeKeyedColorEffectOptions<Subject>,
): Subject => {
  const {rest} = options
  const restCoordinates = toColorEffectCoordinates(rest)
  const coordinates = (options.document.parameterBindings ?? []).reduce((current, binding) => {
    const keyed = options.keyedProperties(binding)
    // A binding whose keyforms all keep the rest values adds no offset, so it is not sampled.
    if (keyed === undefined || !keyed.some(keysColorEffect)) {
      return current
    }
    const sampled = sampleParameterCoordinates({
      binding,
      keyformCoordinates: keyed.map((properties) =>
        properties === undefined
          ? undefined
          : toColorEffectCoordinates({
              multiplyColor: properties.multiplyColor ?? rest.multiplyColor,
              opacity: properties.opacity ?? rest.opacity,
              screenColor: properties.screenColor ?? rest.screenColor,
            }),
      ),
      repeatRanges: getRepeatRanges(binding.parameterIds, options.document.parameters),
      restCoordinates,
      values: getParameterBindingValues({
        binding,
        document: options.document,
        parameterValues: options.parameterValues,
      }),
    })
    const weight = getBindingInfluence({
      binding,
      document: options.document,
      parameterValues: options.parameterValues,
    })
    return current.map(
      (coordinate, index) =>
        coordinate +
        ((sampled[index] ?? restCoordinates[index]!) - restCoordinates[index]!) * weight,
    )
  }, restCoordinates)

  return {...rest, ...fromColorEffectCoordinates(coordinates)}
}
