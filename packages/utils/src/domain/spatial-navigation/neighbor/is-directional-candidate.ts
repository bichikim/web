import {normalizeBox} from './normalize-box'
import {horizontalOverlap, verticalOverlap} from './overlap'
import {resolveSpatialNeighborOptions} from './resolve-options'
import type {Box, Direction, SpatialNeighborOptions} from './types'

/**
 * to가 direction 방향으로 이동 가능한 후보인지 판별한다.
 * requireOverlap이 true면 이동 축에 수직인 축에서 겹쳐야 한다.
 */
export const isDirectionalCandidate = (
  from: Box,
  to: Box,
  direction: Direction,
  options?: SpatialNeighborOptions,
): boolean => {
  const {requireOverlap} = resolveSpatialNeighborOptions(options)
  const fromRect = normalizeBox(from)
  const toRect = normalizeBox(to)

  switch (direction) {
    case 'right': {
      return toRect.cx > fromRect.cx && (!requireOverlap || verticalOverlap(fromRect, toRect) > 0)
    }

    case 'left': {
      return toRect.cx < fromRect.cx && (!requireOverlap || verticalOverlap(fromRect, toRect) > 0)
    }

    case 'down': {
      return toRect.cy > fromRect.cy && (!requireOverlap || horizontalOverlap(fromRect, toRect) > 0)
    }

    case 'up': {
      return toRect.cy < fromRect.cy && (!requireOverlap || horizontalOverlap(fromRect, toRect) > 0)
    }

    default: {
      return false
    }
  }
}
