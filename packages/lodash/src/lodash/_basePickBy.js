import baseGet from './_baseGet.js'
import baseSet from './_baseSet.js'
import castPath from './_castPath.js'

/**
 * The base implementation of  `_.pickBy` without support for iteratee shorthands.
 *
 * @private
 * @param {Object} object The source object.
 * @param {string[]} paths The property paths to pick.
 * @param {Function} predicate The function invoked per property.
 * @returns {Object} Returns the new object.
 */
function basePickBy(object, paths, predicate) {
  let index = -1
  const {length} = paths
  const result = {}

  while (++index < length) {
    const path = paths[index]
    const value = baseGet(object, path)

    if (predicate(value, path)) {
      baseSet(result, castPath(path, object), value)
    }
  }
  return result
}

export default basePickBy
