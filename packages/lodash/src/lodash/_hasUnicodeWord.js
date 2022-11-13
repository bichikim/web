/** Used to detect strings that need a more robust regexp to match words. */
const reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2,}[a-z]|\d[A-Za-z]|[A-Za-z]\d|[^\d A-Za-z]/

/**
 * Checks if `string` contains a word composed of Unicode symbols.
 *
 * @private
 * @param {string} string The string to inspect.
 * @returns {boolean} Returns `true` if a word is found, else `false`.
 */
function hasUnicodeWord(string) {
  return reHasUnicodeWord.test(string)
}

export default hasUnicodeWord
