import {clampUnit} from '../clamp-unit'

/** 진행률을 0~1로 제한해 코사인 이징 값을 반환한다. 유한하지 않은 입력은 0으로 처리한다. */
export const cosineEaseInOut = (progress: number): number =>
  (1 - Math.cos(clampUnit(progress, {fallback: 0}) * Math.PI)) / 2
