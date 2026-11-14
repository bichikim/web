import type {PuppetParameterBlend} from '@winter-love/puppet/player'
import type {PoffoTrackingBindings} from '@winter-love/wallpaper/settings/tracking'
import {resolveTrackingParameter, TRACKING_AXES} from './parameters'
import type {TrackingParameter} from './types'

/** Converts absolute tracking poses to overwrites or displacements from each model default. */
export const createTrackingBlends = (
  parameters: readonly TrackingParameter[],
  bindings: PoffoTrackingBindings = {},
) => {
  const connections = new Map(
    TRACKING_AXES.flatMap(({key}) => {
      const binding = bindings[key]
      const parameter = resolveTrackingParameter(parameters, key, binding?.parameterId)
      return parameter === undefined
        ? []
        : [
            [
              parameter.id,
              {defaultValue: parameter.defaultValue, mode: binding?.blend ?? 'overwrite'},
            ] as const,
          ]
    }),
  )
  return (
    values: Readonly<Record<string, number>>,
  ): Readonly<Record<string, PuppetParameterBlend>> =>
    Object.fromEntries(
      [...connections].flatMap(([id, {mode, defaultValue}]) => {
        const value = values[id]
        return value === undefined
          ? []
          : [[id, {mode, value: mode === 'add' ? value - defaultValue : value}]]
      }),
    )
}
