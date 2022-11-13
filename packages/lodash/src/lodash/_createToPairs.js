import baseToPairs from './_baseToPairs.js'
import getTag from './_getTag.js'
import mapToArray from './_mapToArray.js'
import setToPairs from './_setToPairs.js'

/** `Object#toString` result references. */
const mapTag = '[object Map]'
const setTag = '[object Set]'

/**
 * Creates a `_.toPairs` or `_.toPairsIn` function.
 *
 * @private
 * @param {Function} keysFunc The function to get the keys of a given object.
 * @returns {Function} Returns the new pairs function.
 */
function createToPairs(keysFunc) {
  return function (object) {
    const tag = getTag(object)
    if (tag == mapTag) {
      return mapToArray(object)
    }
    if (tag == setTag) {
      return setToPairs(object)
    }
    return baseToPairs(object, keysFunc(object))
  }
}

export default createToPairs
