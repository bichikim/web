import type {Box, NormalizedBox} from './types'

/** Box를 변 좌표와 중심점이 있는 NormalizedBox로 변환한다. */
export const normalizeBox = (box: Box): NormalizedBox => {
  const left = box.x
  const top = box.y
  const right = box.x + box.w
  const bottom = box.y + box.h

  return {
    bottom,
    cx: left + box.w / 2,
    cy: top + box.h / 2,
    left,
    right,
    top,
  }
}
