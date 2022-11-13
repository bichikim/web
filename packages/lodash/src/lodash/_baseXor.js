import baseDifference from './_baseDifference.js'
import baseFlatten from './_baseFlatten.js'
import baseUniq from './_baseUniq.js'

/**
 * The base implementation of methods like `_.xor`, without support for
 * iteratee shorthands, that accepts an array of arrays to inspect.
 *
 * @private
 * @param {Array} arrays The arrays to inspect.
 * @param {Function} [iteratee] The iteratee invoked per element.
 * @param {Function} [comparator] The comparator invoked per element.
 * @returns {Array} Returns the new array of values.
 */
function baseXor(arrays, iteratee, comparator) {
  const {length} = arrays
  if (length < 2) {
    return length ? baseUniq(arrays[0]) : []
  }
  let index = -1
  const result = Array(length)

  while (++index < length) {
    const array = arrays[index]
    let othIndex = -1

    while (++othIndex < length) {
      if (othIndex != index) {
        result[index] = baseDifference(
          result[index] || array,
          arrays[othIndex],
          iteratee,
          comparator,
        )
      }
    }
  }
  return baseUniq(baseFlatten(result, 1), iteratee, comparator)
}

export default baseXor
