import {resolveSpatialNeighborOptions} from './resolve-options'
import {EXCLUDED_SCORE, scoreDirectionalCandidate} from './score-directional-candidate'
import type {Box, Direction, SpatialNeighborOptions} from './types'

/**
 * 후보 중 scoreDirectionalCandidate 점수가 가장 높은 대상을 반환한다.
 * 후보가 없거나 전원 EXCLUDED_SCORE이면 null.
 */
export const selectBestDirectionalCandidate = <Target extends Box>(
  from: Box,
  direction: Direction,
  targets: readonly Target[],
  options?: SpatialNeighborOptions,
): Target | null => {
  if (targets.length === 0) {
    return null
  }

  const {angleLimit} = resolveSpatialNeighborOptions(options)
  let bestTarget: Target | null = null
  let bestScore = -Infinity

  for (const target of targets) {
    const score = scoreDirectionalCandidate(from, target, direction, angleLimit)
    const isEligible = score > EXCLUDED_SCORE && score > bestScore

    if (isEligible) {
      bestScore = score
      bestTarget = target
    }
  }

  return bestTarget
}
