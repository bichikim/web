import {getPxSize} from 'src/get-px-size'
export type EmOrRem = 'em' | 'rem'

const DEFAULT_BASE_SIZE = 16

/**
 * px size 를  em size 로 바꾸어 줍니다
 * @param size
 * @param baseSize
 * @param type
 */
export const toEm = (
  size: number | string,
  baseSize: number = DEFAULT_BASE_SIZE,
  type: EmOrRem = 'em',
) => {
  const _size = getPxSize(size)

  return `${_size / baseSize}${type}`
}

/**
 * px size 를 rem size 로 바꾸어 줍니다
 * @param pxSize
 * @param baseSize
 */
export const toRem = (pxSize: number | string, baseSize: number = DEFAULT_BASE_SIZE) => {
  return toEm(pxSize, baseSize, 'rem')
}
