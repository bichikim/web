import LazyWrapper from './_LazyWrapper.js'
import LodashWrapper from './_LodashWrapper.js'
import baseAt from './_baseAt.js'
import flatRest from './_flatRest.js'
import isIndex from './_isIndex.js'
import thru from './thru.js'

/**
 * This method is the wrapper version of `_.at`.
 *
 * @name at
 * @memberOf _
 * @since 1.0.0
 * @category Seq
 * @param {...(string|string[])} [paths] The property paths to pick.
 * @returns {Object} Returns the new `lodash` wrapper instance.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }, 4] };
 *
 * _(object).at(['a[0].b.c', 'a[1]']).value();
 * // => [3, 4]
 */
const wrapperAt = flatRest(function (paths) {
  const {length} = paths
  const start = length ? paths[0] : 0
  let value = this.__wrapped__
  const interceptor = function (object) {
    return baseAt(object, paths)
  }

  if (
    length > 1 ||
    this.__actions__.length > 0 ||
    !(value instanceof LazyWrapper) ||
    !isIndex(start)
  ) {
    return this.thru(interceptor)
  }
  value = value.slice(start, Number(start) + (length ? 1 : 0))
  value.__actions__.push({
    args: [interceptor],
    func: thru,
    thisArg: undefined,
  })
  return new LodashWrapper(value, this.__chain__).thru(function (array) {
    if (length && array.length === 0) {
      array.push(undefined)
    }
    return array
  })
})

export default wrapperAt
