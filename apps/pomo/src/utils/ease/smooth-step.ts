const HERMITE_SCALE = 3

/** 3차 Hermite 이징 값을 반환한다. 입력 범위를 제한하거나 유효하지 않은 숫자를 대체하지 않는다. */
export const smoothStep = (progress: number): number =>
  progress * progress * (HERMITE_SCALE - 2 * progress)
