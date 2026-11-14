import {VALUE_TAG} from './tags'

/** Selects an exact packed representation, preserving negative zero and Float64 precision. */
export const getNumberPacking = (values: ReadonlyArray<unknown>): number | undefined => {
  if (values.length === 0) {
    return undefined
  }
  let minimum = Infinity
  let maximum = -Infinity
  let integer = true
  let float32 = true
  for (const value of values) {
    if (typeof value !== 'number') {
      return undefined
    }
    if (!Number.isFinite(value)) {
      throw new TypeError('Non-finite Poffo number')
    }
    integer &&= Number.isInteger(value) && !Object.is(value, -0)
    float32 &&= Object.is(Math.fround(value), value)
    minimum = Math.min(minimum, value)
    maximum = Math.max(maximum, value)
  }
  const UINT8_MAXIMUM = 255
  const UINT16_MAXIMUM = 65_535
  const UINT32_MAXIMUM = 4_294_967_295
  const INT32_MINIMUM = -2_147_483_648
  const INT32_MAXIMUM = 2_147_483_647
  if (integer && minimum >= 0 && maximum <= UINT32_MAXIMUM) {
    return maximum <= UINT8_MAXIMUM
      ? VALUE_TAG.uint8
      : maximum <= UINT16_MAXIMUM
        ? VALUE_TAG.uint16
        : VALUE_TAG.uint32
  }
  if (integer && minimum >= INT32_MINIMUM && maximum <= INT32_MAXIMUM) {
    return VALUE_TAG.int32
  }
  return float32 ? VALUE_TAG.float32 : VALUE_TAG.float64
}
