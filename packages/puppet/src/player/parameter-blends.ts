import type {PuppetParameterValueMap} from '../deformation'
import type {PuppetDocument} from './document'
import {resolveParameterValue} from './parameter-value'

/**
 * How an app's value meets a parameter's value after motions and expressions (Cubism's
 * parameter operations): `overwrite` moves toward it, `add` adds it and `multiply` multiplies
 * by it, each by `weight`.
 */
export type PuppetParameterBlendMode = 'add' | 'multiply' | 'overwrite'
export type ParameterBlendStage = 'before-physics' | 'after-physics'

export interface PuppetParameterBlend {
  readonly mode: PuppetParameterBlendMode
  readonly value: number
  /** Share of the operation, `0..1`; defaults to 1. */
  readonly weight?: number
}

const MODES: ReadonlySet<string> = new Set<PuppetParameterBlendMode>([
  'add',
  'multiply',
  'overwrite',
])

/** The blend with its weight limited to `0..1`; `undefined` for unknown modes or non-finite numbers. */
export const normalizeParameterBlend = (
  blend: PuppetParameterBlend,
): PuppetParameterBlend | undefined => {
  const weight = blend.weight ?? 1
  return MODES.has(blend.mode) && Number.isFinite(blend.value) && Number.isFinite(weight)
    ? {mode: blend.mode, value: blend.value, weight: Math.min(1, Math.max(0, weight))}
    : undefined
}

/** `current` after the blend, before it is limited to the parameter's range. */
export const blendParameterValue = (current: number, blend: PuppetParameterBlend) => {
  const weight = blend.weight ?? 1
  switch (blend.mode) {
    case 'add':
      return current + blend.value * weight
    case 'multiply':
      return current * (1 + (blend.value - 1) * weight)
    case 'overwrite':
      return current + (blend.value - current) * weight
  }
}

/** Applies each parameter's blend, within the parameter's range, in document parameter order. */
export const applyParameterBlends = (
  document: PuppetDocument,
  values: PuppetParameterValueMap,
  blends: ReadonlyMap<string, PuppetParameterBlend>,
): PuppetParameterValueMap => {
  if (blends.size === 0) {
    return values
  }
  const next = {...values}
  for (const parameter of document.parameters ?? []) {
    const blend = blends.get(parameter.id)
    if (blend !== undefined) {
      const current = values[parameter.id] ?? parameter.defaultValue
      next[parameter.id] = resolveParameterValue(parameter, blendParameterValue(current, blend))
    }
  }
  return next
}
