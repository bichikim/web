import arrayFilter from './_arrayFilter.js'
import baseIteratee from './_baseIteratee.js'
import baseRest from './_baseRest.js'
import baseXor from './_baseXor.js'
import isArrayLikeObject from './isArrayLikeObject.js'
import last from './last.js'

/**
 * This method is like `_.xor` except that it accepts `iteratee` which is
 * invoked for each element of each `arrays` to generate the criterion by
 * which by which they're compared. The order of result values is determined
 * by the order they occur in the arrays. The iteratee is invoked with one
 * argument: (value).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Array
 * @param {...Array} [arrays] The arrays to inspect.
 * @param {Function} [iteratee=_.identity] The iteratee invoked per element.
 * @returns {Array} Returns the new array of filtered values.
 * @example
 *
 * _.xorBy([2.1, 1.2], [2.3, 3.4], Math.floor);
 * // => [1.2, 3.4]
 *
 * // The `_.property` iteratee shorthand.
 * _.xorBy([{ 'x': 1 }], [{ 'x': 2 }, { 'x': 1 }], 'x');
 * // => [{ 'x': 2 }]
 */
const xorBy = baseRest(function (arrays) {
  let iteratee = last(arrays)
  if (isArrayLikeObject(iteratee)) {
    iteratee = undefined
  }
  return baseXor(arrayFilter(arrays, isArrayLikeObject), baseIteratee(iteratee, 2))
})

export default xorBy
