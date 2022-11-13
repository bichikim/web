import SetCache from './_SetCache.js'
import arrayIncludes from './_arrayIncludes.js'
import arrayIncludesWith from './_arrayIncludesWith.js'
import arrayMap from './_arrayMap.js'
import baseUnary from './_baseUnary.js'
import cacheHas from './_cacheHas.js'

/** Used as the size to enable large array optimizations. */
const LARGE_ARRAY_SIZE = 200

/**
 * The base implementation of methods like `_.difference` without support
 * for excluding multiple arrays or iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Array} values The values to exclude.
 * @param {Function} [iteratee] The iteratee invoked per element.
 * @param {Function} [comparator] The comparator invoked per element.
 * @returns {Array} Returns the new array of filtered values.
 */
function baseDifference(array, values, iteratee, comparator) {
  let index = -1
  let includes = arrayIncludes
  let isCommon = true
  const {length} = array
  const result = []
  const valuesLength = values.length

  if (!length) {
    return result
  }
  if (iteratee) {
    values = arrayMap(values, baseUnary(iteratee))
  }
  if (comparator) {
    includes = arrayIncludesWith
    isCommon = false
  } else if (values.length >= LARGE_ARRAY_SIZE) {
    includes = cacheHas
    isCommon = false
    values = new SetCache(values)
  }
  outer: while (++index < length) {
    let value = array[index]
    const computed = iteratee == null ? value : iteratee(value)

    value = comparator || value !== 0 ? value : 0
    if (isCommon && computed === computed) {
      let valuesIndex = valuesLength
      while (valuesIndex--) {
        if (values[valuesIndex] === computed) {
          continue outer
        }
      }
      result.push(value)
    } else if (!includes(values, computed, comparator)) {
      result.push(value)
    }
  }
  return result
}

export default baseDifference
