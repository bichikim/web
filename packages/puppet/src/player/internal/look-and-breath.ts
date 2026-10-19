import type {PuppetParameterValueMap} from '../../deformation'
import type {PuppetDocument} from '../document'
import {
  advanceLookPoint,
  applyLook,
  clampLookTarget,
  isLookSettled,
  LOOK_REST,
  type LookTarget,
} from '../look'
import {applyBreath} from '../breath'

export interface LookAndBreath {
  /** Advances the look point and breathing by `deltaTime` seconds. */
  advance(deltaTime: number): void
  /** Adds look, then breath (Cubism's update order), at the advanced time. */
  apply(document: PuppetDocument, values: PuppetParameterValueMap): PuppetParameterValueMap
  isAnimating(document: PuppetDocument): boolean
  /** Returns whether breathing switched; turning it on starts the waves from 0 seconds. */
  setBreath(enabled: boolean): boolean
  /** Where to look, `-1..1` (x right, y up); omitted returns to the center. */
  setLookTarget(target?: LookTarget): void
}

/** The look point and breathing a player adds after motions and before physics. */
export const createLookAndBreath = (): LookAndBreath => {
  // Seconds since breathing started; undefined while it is off.
  let breathTime: number | undefined
  let lookTarget = clampLookTarget(undefined)
  let lookPoint = LOOK_REST
  return {
    advance(deltaTime) {
      breathTime = breathTime === undefined ? undefined : breathTime + deltaTime
      lookPoint = advanceLookPoint(lookPoint, lookTarget, deltaTime)
    },
    apply(document, values) {
      const looked = document.look === undefined ? values : applyLook(document, values, lookPoint)
      return breathTime === undefined ? looked : applyBreath(document, looked, breathTime)
    },
    isAnimating: (document) =>
      (breathTime !== undefined && (document.breath?.length ?? 0) > 0) ||
      ((document.look?.length ?? 0) > 0 && !isLookSettled(lookPoint, lookTarget)),
    setBreath(enabled) {
      if (enabled === (breathTime !== undefined)) {
        return false
      }
      breathTime = enabled ? 0 : undefined
      return true
    },
    setLookTarget(target) {
      lookTarget = clampLookTarget(target)
    },
  }
}
