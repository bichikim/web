import {normalizeBox} from './normalize-box'
import {type Box, defaultSpatialNeighborOptions, type Direction} from './types'

const PRIMARY_DISTANCE_SCALE = 10_000
const DISTRIBUTION_PENALTY = 0.1

/** 후보 제외를 나타내는 점수. 유효한 유한 점수와 충돌하지 않는다. */
export const EXCLUDED_SCORE = Number.NEGATIVE_INFINITY

// AI_NOTE - Coong space-focus scoreAngleCandidate 휴리스틱을 x,y,w,h Box API로 이식.

/**
 * 후보의 방향 적합도 점수를 반환한다. 값이 클수록 해당 방향으로 이동하기 유리하다.
 * angleLimit을 초과하는 대각선 후보와 주축 반대·동일 위치 후보는 EXCLUDED_SCORE를 반환한다.
 */
export const scoreDirectionalCandidate = (
  from: Box,
  to: Box,
  direction: Direction,
  angleLimit: number = defaultSpatialNeighborOptions.angleLimit,
): number => {
  const fromRect = normalizeBox(from)
  const toRect = normalizeBox(to)
  const deltaX = toRect.cx - fromRect.cx
  const deltaY = toRect.cy - fromRect.cy

  let primary = 0
  let secondary = 0

  switch (direction) {
    case 'right': {
      primary = deltaX
      secondary = Math.abs(deltaY)
      break
    }

    case 'left': {
      primary = -deltaX
      secondary = Math.abs(deltaY)
      break
    }

    case 'down': {
      primary = deltaY
      secondary = Math.abs(deltaX)
      break
    }

    case 'up': {
      primary = -deltaY
      secondary = Math.abs(deltaX)
      break
    }
  }

  if (primary <= 0) {
    return EXCLUDED_SCORE
  }

  const distribution = Math.hypot(deltaX, deltaY)
  const angleRatio = secondary / primary

  if (angleRatio > angleLimit) {
    return EXCLUDED_SCORE
  }

  return PRIMARY_DISTANCE_SCALE / primary - secondary * 2 - distribution * DISTRIBUTION_PENALTY
}
