import type {PuppetParameterValueMap} from '../../deformation'
import type {PuppetDocument} from '../document'
import {
  applyParameterBlends,
  normalizeParameterBlend,
  type PuppetParameterBlend,
} from '../parameter-blends'
import {isValidPhysicsOptions, type PuppetPhysicsOptions} from '../physics-options'

/** Parameter blends and physics options an app sets on a player. */
export interface AppAdjustments {
  applyBlends(document: PuppetDocument, values: PuppetParameterValueMap): PuppetParameterValueMap
  physicsOptions(): PuppetPhysicsOptions | undefined
  /** Returns false (changing nothing) for unknown parameters and invalid blends. */
  setParameterBlend(
    document: PuppetDocument,
    parameterId: string,
    blend: PuppetParameterBlend | undefined,
  ): boolean
  /** Returns false (changing nothing) for invalid options. */
  setPhysicsOptions(options: PuppetPhysicsOptions | undefined): boolean
}

export const createAppAdjustments = (): AppAdjustments => {
  const blends = new Map<string, PuppetParameterBlend>()
  let physicsOptions: PuppetPhysicsOptions | undefined
  return {
    applyBlends: (document, values) => applyParameterBlends(document, values, blends),
    physicsOptions: () => physicsOptions,
    setParameterBlend(document, parameterId, blend) {
      const normalized = blend === undefined ? undefined : normalizeParameterBlend(blend)
      const known = document.parameters?.some((parameter) => parameter.id === parameterId)
      if (known !== true || (blend !== undefined && normalized === undefined)) {
        return false
      }
      if (normalized === undefined) {
        blends.delete(parameterId)
      } else {
        blends.set(parameterId, normalized)
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
