import {isDirectionalCandidate} from './is-directional-candidate'
import type {Box, Direction, SpatialNeighborOptions} from './types'

/** targets에서 direction·options 조건을 만족하는 후보만 반환한다. */
export const filterDirectionalCandidates = <Target extends Box>(
  from: Box,
  direction: Direction,
  targets: readonly Target[],
  options?: SpatialNeighborOptions,
): Target[] => {
  return targets.filter((target) => isDirectionalCandidate(from, target, direction, options))
}
