import {clamp} from 'es-toolkit/math'

const UNIT_MAXIMUM = 1
const UNIT_MINIMUM = 0

/** 숫자를 양 끝을 포함하는 0~1 범위로 제한해 반환한다. */
export const clampUnit = (value: number): number => clamp(value, UNIT_MINIMUM, UNIT_MAXIMUM)
