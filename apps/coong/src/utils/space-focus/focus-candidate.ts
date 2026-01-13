/* eslint-disable no-magic-numbers */
import {type Direction, type FocusRect, getSiblingRects, getUpdatedRect, type Rect} from './focus-store'

export const verticalOverlap = (from: Rect, to: Rect): number => {
  return Math.min(from.bottom, to.bottom) - Math.max(from.top, to.top)
}

export const horizontalOverlap = (from: Rect, to: Rect): number => {
  return Math.min(from.right, to.right) - Math.max(from.left, to.left)
}

export const filterCandidate = (from: Rect, to: Rect, direction: Direction): boolean => {
  switch (direction) {
    case 'right': {
      return to.cx > from.cx && verticalOverlap(from, to) > 0
    }

    case 'left': {
      return to.cx < from.cx && verticalOverlap(from, to) > 0
    }

    case 'down': {
      return to.cy > from.cy && horizontalOverlap(from, to) > 0
    }

    case 'up': {
      return to.cy < from.cy && horizontalOverlap(from, to) > 0
    }

    default: {
      return false
    }
  }
}

export const filterCandidates = (from: FocusRect, to: FocusRect[], direction: Direction): FocusRect[] => {
  const _from = getUpdatedRect(from)
  const fromRect = _from.rect

  if (fromRect === null) {
    return []
  }

  return to.filter((item: FocusRect) => {
    const _item = getUpdatedRect(item)
    const itemRect = _item.rect

    if (itemRect === null || item.isInactive) {
      return false
    }

    return filterCandidate(fromRect, itemRect, direction)
  })
}

const EXCLUDED_SCORE = -10_000

export const scoreAngleCandidate = (
  from: FocusRect,
  to: FocusRect,
  direction: Direction,
  angleLimit: number,
): number => {
  const _to = getUpdatedRect(to)
  const _from = getUpdatedRect(from)
  const toRect = _to.rect
  const fromRect = _from.rect

  if (toRect === null || fromRect === null || to.isInactive) {
    return EXCLUDED_SCORE
  }

  const dx = toRect.cx - fromRect.cx
  const dy = toRect.cy - fromRect.cy

  // 방향에 따른 주축(primary) 거리
  let primary = 0
  let secondary = 0

  switch (direction) {
    case 'right': {
      primary = dx
      secondary = Math.abs(dy)
      break
    }

    case 'left': {
      primary = -dx
      secondary = Math.abs(dy)
      break
    }

    case 'down': {
      primary = dy
      secondary = Math.abs(dx)
      break
    }

    case 'up': {
      primary = -dy
      secondary = Math.abs(dx)
      break
    }
  }

  // 주축(primary)이 0 이하 → 해당 방향이 아님
  if (primary <= 0) {
    return EXCLUDED_SCORE
  }

  // 전체 거리
  const distribution = Math.hypot(dx, dy)

  // 각도 penalty (0~1 비율)
  // 각도가 클수록 (즉, 더 사선일수록) secondary/primary 비율이 올라감
  const angleRatio = secondary / primary

  // angleLimit을 넘으면 후보 제외
  if (angleRatio > angleLimit) {
    return EXCLUDED_SCORE
  }

  // 스코어 = 주축 가중 + 보조축 패널티 + 거리 패널티
  // 가중치는 원하는 UX에 맞게 조정 가능
  const score =
    // 주축 가까울수록 높은 점수

    10_000 / primary -
    // 사선으로 벗어난 정도 패널티
    secondary * 2 -
    // 전체 거리 패널티

    distribution * 0.1

  return score
}

export const moveFocus = (from: FocusRect, to: FocusRect[], direction: Direction): FocusRect | null => {
  const candidates = filterCandidates(from, to, direction)

  if (candidates.length === 0) {
    return null
  }

  const scores = candidates.map((candidate) => scoreAngleCandidate(from, candidate, direction, 0.5))
  let maxScore = -Infinity
  let maxIndex = -1

  for (const [index, score] of scores.entries()) {
    if (score > maxScore) {
      maxScore = score
      maxIndex = index
    }
  }

  if (maxIndex === -1) {
    return null
  }

  const nextRect = candidates[maxIndex] ?? null

  if (nextRect === null) {
    return null
  }

  if (nextRect.children.size === 0) {
    return nextRect
  }

  return moveFocus(from, [...nextRect.children], direction)
}

export const jumpFocus = (from: FocusRect, to: FocusRect[], direction: Direction): FocusRect | null => {
  const nextRect = moveFocus(from, to, direction)

  if (nextRect) {
    return nextRect
  }

  const {parent} = from

  if (!parent) {
    return null
  }

  const siblingRects = getSiblingRects(parent)

  if (siblingRects.size === 0) {
    return null
  }

  return jumpFocus(from, [...siblingRects], direction)
}
