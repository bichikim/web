import type {PuppetParameterValueMap} from '../deformation/composition'
import type {PuppetPoint} from './document'

export interface ParameterDragOptions {
  /** Grabbed point in canvas CSS pixels. */
  readonly point: PuppetPoint
  /** Joint parameters ordered from the anchored root toward the free end. */
  readonly parameterIds: readonly string[]
  readonly preserveAngle?: boolean
  /** Relative mobility per joint, 0 (locked) to 1 (free). */
  readonly mobility?: readonly number[]
}
export interface ParameterDrag {
  /** Absolute joint values for this canvas target, optionally retaining its initial orientation. */
  solve(point: PuppetPoint): PuppetParameterValueMap
}
