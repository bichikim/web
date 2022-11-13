import Symbol from './_Symbol.js'
import isArguments from './isArguments.js'
import isArray from './isArray.js'

/** Built-in value references. */
const spreadableSymbol = Symbol ? Symbol.isConcatSpreadable : undefined

/**
 * Checks if `value` is a flattenable `arguments` object or array.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is flattenable, else `false`.
 */
function isFlattenable(value) {
  return (
    isArray(value) ||
    isArguments(value) ||
    Boolean(spreadableSymbol && value && value[spreadableSymbol])
  )
}

export default isFlattenable
