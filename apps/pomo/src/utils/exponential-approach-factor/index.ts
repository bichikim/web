/** 경과 시간과 시정수로 프레임에 독립적인 접근 계수를 계산해 반환한다. */
export const exponentialApproachFactor = (elapsed: number, timeConstant: number): number =>
  -Math.expm1(-elapsed / timeConstant)
