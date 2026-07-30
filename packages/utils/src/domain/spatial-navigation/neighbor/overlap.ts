import type {NormalizedBox} from './types'

/** 두 박스의 세로(위·아래) 구간 겹침 길이. 0 초과면 같은 행으로 겹친다. */
export const verticalOverlap = (from: NormalizedBox, to: NormalizedBox): number => {
  return Math.min(from.bottom, to.bottom) - Math.max(from.top, to.top)
}

/** 두 박스의 가로(좌·우) 구간 겹침 길이. 0 초과면 같은 열로 겹친다. */
export const horizontalOverlap = (from: NormalizedBox, to: NormalizedBox): number => {
  return Math.min(from.right, to.right) - Math.max(from.left, to.left)
}
