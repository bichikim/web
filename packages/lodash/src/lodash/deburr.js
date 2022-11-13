import deburrLetter from './_deburrLetter.js'
import toString from './toString.js'

/** Used to match Latin Unicode letters (excluding mathematical operators). */
const reLatin = /[\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u017F]/g

/** Used to compose unicode character classes. */
const rsComboMarksRange = '\\u0300-\\u036f'
const reComboHalfMarksRange = '\\ufe20-\\ufe2f'
const rsComboSymbolsRange = '\\u20d0-\\u20ff'
const rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange

/** Used to compose unicode capture groups. */
const rsCombo = `[${rsComboRange}]`

/**
 * Used to match [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks) and
 * [combining diacritical marks for symbols](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks_for_Symbols).
 */
const reComboMark = RegExp(rsCombo, 'g')

/**
 * Deburrs `string` by converting
 * [Latin-1 Supplement](https://en.wikipedia.org/wiki/Latin-1_Supplement_(Unicode_block)#Character_table)
 * and [Latin Extended-A](https://en.wikipedia.org/wiki/Latin_Extended-A)
 * letters to basic Latin letters and removing
 * [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks).
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category String
 * @param {string} [string=''] The string to deburr.
 * @returns {string} Returns the deburred string.
 * @example
 *
 * _.deburr('déjà vu');
 * // => 'deja vu'
 */
function deburr(string) {
  string = toString(string)
  return string && string.replace(reLatin, deburrLetter).replace(reComboMark, '')
}

export default deburr
