const FULL_ROTATION_DEGREES = 360

/** 유한한 각도를 0 이상 360 미만으로 순환시킨다. ±0은 +0, 비유한 값은 NaN을 반환한다. */
export const wrapDegrees = (angle: number): number =>
  ((angle % FULL_ROTATION_DEGREES) + FULL_ROTATION_DEGREES) % FULL_ROTATION_DEGREES
