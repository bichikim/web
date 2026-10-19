const HERMITE_SCALE = 3

/** 0~1 범위의 진행률에 대한 3차 Hermite 이징 값을 반환한다. */
export const smoothStep = (progress: number): number =>
  progress * progress * (HERMITE_SCALE - 2 * progress)
