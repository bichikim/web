import castPath from './_castPath.js'
import isArguments from './isArguments.js'
import isArray from './isArray.js'
import isIndex from './_isIndex.js'
import isLength from './isLength.js'
import toKey from './_toKey.js'

/**
 * Checks if `path` exists on `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path to check.
 * @param {Function} hasFunc The function to check properties.
 * @returns {boolean} Returns `true` if `path` exists, else `false`.
 */
function hasPath(object, path, hasFunc) {
  path = castPath(path, object)

  let index = -1
  let {length} = path
  let result = false

  while (++index < length) {
    var key = toKey(path[index])
    if (!(result = object != null && hasFunc(object, key))) {
      break
    }
    object = object[key]
  }
  if (result || ++index != length) {
    return result
  }
  length = object == null ? 0 : object.length
  return (
    Boolean(length) &&
    isLength(length) &&
    isIndex(key, length) &&
    (isArray(object) || isArguments(object))
  )
}

export default hasPath
