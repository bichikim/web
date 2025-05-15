import {addUnit} from 'src/add-unit'
import {getPxSize} from 'src/get-px-size'

export type EmOrRem = 'em' | 'rem'

const DEFAULT_EM_SIZE = 16

export const toUnit = (
  size: number | string,
  type: string = 'px',
  fixSize: (value: number) => number = (value) => value,
) => {
  const _size = getPxSize(size)

  return addUnit(fixSize(_size), type)
}

export const toPx = (size: number | string) => toUnit(size)

/**
 * px size 를  em size 로 바꾸어 줍니다
 * @param size
 * @param emSize
 * @param type
 */
export const toRem = (size: number | string, emSize = DEFAULT_EM_SIZE, type: EmOrRem = 'rem') =>
  toUnit(size, type, (value) => value / emSize)

/**
 * px size 를 rem size 로 바꾸어 줍니다
 * @param pxSize
 * @param emSize
 */
export const toEm = (pxSize: number | string, emSize: number = DEFAULT_EM_SIZE) => {
  return toRem(pxSize, emSize, 'em')
}
