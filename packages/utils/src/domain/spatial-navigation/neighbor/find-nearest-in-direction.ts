import {filterDirectionalCandidates} from './filter-directional-candidates'
import {selectBestDirectionalCandidate} from './select-best-directional-candidate'
import {targetsExcept} from './targets-except'
import type {Box, Direction, SpatialNeighborOptions} from './types'

/** from에서 direction 방향으로 이동할 때 가장 적합한 대상을 반환한다. 없으면 null. */
export const findNearestInDirection = <Target extends Box>(
  from: Target,
  targets: readonly Target[],
  direction: Direction,
  options?: SpatialNeighborOptions,
): Target | null => {
  // 자기 자신으로 포커스가 돌아가는 것을 막음. 동일 좌표·다른 참조 객체는 후보에 남음.
  const withoutFrom = targetsExcept(from, targets)
  const candidates = filterDirectionalCandidates(from, direction, withoutFrom, options)

  return selectBestDirectionalCandidate(from, direction, candidates, options)
}
