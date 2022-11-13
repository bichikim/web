import basePropertyOf from './_basePropertyOf.js'

/** Used to map HTML entities to characters. */
const htmlUnescapes = {
  '&#39;': "'",
  '&amp;': '&',
  '&gt;': '>',
  '&lt;': '<',
  '&quot;': '"',
}

/**
 * Used by `_.unescape` to convert HTML entities to characters.
 *
 * @private
 * @param {string} chr The matched character to unescape.
 * @returns {string} Returns the unescaped character.
 */
const unescapeHtmlChar = basePropertyOf(htmlUnescapes)

export default unescapeHtmlChar
