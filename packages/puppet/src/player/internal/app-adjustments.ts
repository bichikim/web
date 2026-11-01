import type {PuppetParameterValueMap} from '../../deformation'
import type {PuppetDocument} from '../document'
import {
  applyParameterBlends,
  normalizeParameterBlend,
  type ParameterBlendStage,
  type PuppetParameterBlend,
} from '../parameter-blends'
import {isValidPhysicsOptions, type PuppetPhysicsOptions} from '../physics-options'

/** Parameter blends and physics options an app sets on a player. */
export interface AppAdjustments {
  applyBlends(
    document: PuppetDocument,
    values: PuppetParameterValueMap,
    stage?: ParameterBlendStage,
  ): PuppetParameterValueMap
  physicsOptions(): PuppetPhysicsOptions | undefined
  /** Returns false (changing nothing) for unknown parameters and invalid blends. */
  setParameterBlend(
    document: PuppetDocument,
    parameterId: string,
    blend: PuppetParameterBlend | undefined,
    stage?: ParameterBlendStage,
  ): boolean
  /** Returns false (changing nothing) for invalid options. */
  setPhysicsOptions(options: PuppetPhysicsOptions | undefined): boolean
}

export const createAppAdjustments = (): AppAdjustments => {
  const blends: Record<ParameterBlendStage, Map<string, PuppetParameterBlend>> = {
    'after-physics': new Map(),
    'before-physics': new Map(),
  }
  let physicsOptions: PuppetPhysicsOptions | undefined
  return {
    applyBlends: (document, values, stage = 'before-physics') =>
      applyParameterBlends(document, values, blends[stage]),
    physicsOptions: () => physicsOptions,
    setParameterBlend(document, parameterId, blend, stage = 'before-physics') {
      const normalized = blend === undefined ? undefined : normalizeParameterBlend(blend)
      const known = document.parameters?.some((parameter) => parameter.id === parameterId)
      if (known !== true || (blend !== undefined && normalized === undefined)) {
        return false
      }
      if (normalized === undefined) {
        blends[stage].delete(parameterId)
      } else {
        blends[stage].set(parameterId, normalized)
      }
      return true
    },
    setPhysicsOptions(options) {
      if (options !== undefined && !isValidPhysicsOptions(options)) {
        return false
      }
      physicsOptions = options
      return true
    },
  }
}
