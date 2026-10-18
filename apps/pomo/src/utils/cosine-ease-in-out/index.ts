import {clampUnit} from '../clamp-unit'

/** 0~1 범위에서 코사인 이징을 적용한 진행률을 반환한다. */
export const cosineEaseInOut = (progress: number): number =>
  (1 - Math.cos(clampUnit(progress) * Math.PI)) / 2
