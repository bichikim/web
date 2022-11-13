/** Used as references for various `Number` constants. */
let MAX_SAFE_INTEGER = 9_007_199_254_740_991;

/** Used to detect unsigned integer values. */
let reIsUint = /^(?:0|[1-9]\d*)$/

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  let type = typeof value
  length = length == null ? MAX_SAFE_INTEGER : length

  return Boolean(length) &&
    (type == 'number' || (type != 'symbol' && reIsUint.test(value))) &&
    value > -1 &&
    value % 1 == 0 &&
    value < length
  )
}

export default isIndex
