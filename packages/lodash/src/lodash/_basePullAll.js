import arrayMap from './_arrayMap.js'
import baseIndexOf from './_baseIndexOf.js'
import baseIndexOfWith from './_baseIndexOfWith.js'
import baseUnary from './_baseUnary.js'
import copyArray from './_copyArray.js'

/** Used for built-in method references. */
const arrayProto = Array.prototype

/** Built-in value references. */
const {splice} = arrayProto

/**
 * The base implementation of `_.pullAllBy` without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to remove.
 * @param {Function} [iteratee] The iteratee invoked per element.
 * @param {Function} [comparator] The comparator invoked per element.
 * @returns {Array} Returns `array`.
 */
function basePullAll(array, values, iteratee, comparator) {
  const indexOf = comparator ? baseIndexOfWith : baseIndexOf
  let index = -1
  const {length} = values
  let seen = array

  if (array === values) {
    values = copyArray(values)
  }
  if (iteratee) {
    seen = arrayMap(array, baseUnary(iteratee))
  }
  while (++index < length) {
    let fromIndex = 0
    const value = values[index]
    const computed = iteratee ? iteratee(value) : value

    while ((fromIndex = indexOf(seen, computed, fromIndex, comparator)) > -1) {
      if (seen !== array) {
        splice.call(seen, fromIndex, 1)
      }
      splice.call(array, fromIndex, 1)
    }
  }
  return array
}

export default basePullAll
