import basePropertyOf from './_basePropertyOf.js'

/** Used to map characters to HTML entities. */
const htmlEscapes = {
  '"': '&quot;',
  '&': '&amp;',
  "'": '&#39;',
  '<': '&lt;',
  '>': '&gt;',
}

/**
 * Used by `_.escape` to convert characters to HTML entities.
 *
 * @private
 * @param {string} chr The matched character to escape.
 * @returns {string} Returns the escaped character.
 */
const escapeHtmlChar = basePropertyOf(htmlEscapes)

export default escapeHtmlChar
