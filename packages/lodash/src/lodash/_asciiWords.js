/** Used to match words composed of alphanumeric characters. */
const reAsciiWord = /[^\u0000-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007F]+/g

/**
 * Splits an ASCII `string` into an array of its words.
 *
 * @private
 * @param {string} The string to inspect.
 * @returns {Array} Returns the words of `string`.
 */
function asciiWords(string) {
  return string.match(reAsciiWord) || []
}

export default asciiWords
