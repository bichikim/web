const TRAILING_SYMBOL_PATTERN = /^\p{S}$/u
const ATTACHED_MARK_PATTERN = /^[\uFE0E\uFE0F\u20E0]$/u
const KEYCAP_BASE_PATTERN = /^[#*0-9]$/u
const TAG_BASE_PATTERN = /^\p{Extended_Pictographic}$/u
const TAG_CHARACTER_PATTERN = /^[\u{E0020}-\u{E007E}]$/u
const TAG_END_CHARACTER = '\u{E007F}'
const MODIFIER_BASE_PATTERN = /^\p{Emoji_Modifier_Base}$/u
const MODIFIER_PATTERN = /^\p{Emoji_Modifier}$/u
const WHITESPACE_PATTERN = /^\p{White_Space}$/u

const getKeycapBase = (characters: readonly string[], index: number) => {
  if (characters[index] !== '\u20E3') {
    return -1
  }

  const variationSelectorIndex = index - 1
  const keycapBaseIndex =
    characters[variationSelectorIndex] === '\uFE0F'
      ? variationSelectorIndex - 1
      : variationSelectorIndex

  return keycapBaseIndex >= 0 && KEYCAP_BASE_PATTERN.test(characters[keycapBaseIndex] ?? '')
    ? keycapBaseIndex
    : -1
}

const getTagBase = (characters: readonly string[], index: number) => {
  const character = characters[index]
  const previousCharacter = characters[index - 1]

  if (
    character !== undefined &&
    MODIFIER_PATTERN.test(character) &&
    previousCharacter !== undefined &&
    MODIFIER_BASE_PATTERN.test(previousCharacter)
  ) {
    return index - 1
  }

  if (
    character === '\uFE0F' &&
    previousCharacter !== undefined &&
    TAG_BASE_PATTERN.test(previousCharacter)
  ) {
    return index - 1
  }

  return character !== undefined && TAG_BASE_PATTERN.test(character) ? index : -1
}

const getTagStart = (characters: readonly string[], index: number) => {
  if (characters[index] !== TAG_END_CHARACTER) {
    return -1
  }

  let tagSpecificationIndex = index - 1

  while (
    tagSpecificationIndex >= 0 &&
    TAG_CHARACTER_PATTERN.test(characters[tagSpecificationIndex] ?? '')
  ) {
    tagSpecificationIndex -= 1
  }

  return tagSpecificationIndex === index - 1 ? -1 : getTagBase(characters, tagSpecificationIndex)
}

/**
 * Removes a suffix of Unicode Symbol code points and adjacent Unicode White_Space.
 * Supports keycaps, terminated pictographic tags, U+FE0E/FE0F/20E0 marks, and symbol-linked joiners.
 * Unsupported characters stop scanning; no-symbol inputs and unresolved mark/joiner tails stay unchanged.
 * Preserves remaining text verbatim without validating complete emoji sequences.
 */
export const stripTrailingSymbols = (value: string): string => {
  const characters = Array.from(value)
  let index = characters.length - 1
  let hasTrailingSymbols = false
  let requiresPrecedingSymbol = false

  while (index >= 0) {
    const character = characters[index]!
    const tagStartIndex = getTagStart(characters, index)
    const keycapBaseIndex = getKeycapBase(characters, index)

    if (requiresPrecedingSymbol) {
      if (TRAILING_SYMBOL_PATTERN.test(character)) {
        requiresPrecedingSymbol = false
        hasTrailingSymbols = true
        index -= 1
      } else if (tagStartIndex >= 0) {
        requiresPrecedingSymbol = false
        hasTrailingSymbols = true
        index = tagStartIndex - 1
      } else if (keycapBaseIndex >= 0) {
        requiresPrecedingSymbol = false
        hasTrailingSymbols = true
        index = keycapBaseIndex - 1
      } else if (ATTACHED_MARK_PATTERN.test(character)) {
        index -= 1
      } else {
        break
      }
    } else if (WHITESPACE_PATTERN.test(character)) {
      index -= 1
    } else if (character === '\u200D' && hasTrailingSymbols) {
      requiresPrecedingSymbol = true
      index -= 1
    } else if (tagStartIndex >= 0) {
      hasTrailingSymbols = true
      index = tagStartIndex - 1
    } else if (keycapBaseIndex >= 0) {
      hasTrailingSymbols = true
      index = keycapBaseIndex - 1
    } else if (ATTACHED_MARK_PATTERN.test(character)) {
      requiresPrecedingSymbol = true
      index -= 1
    } else if (TRAILING_SYMBOL_PATTERN.test(character)) {
      hasTrailingSymbols = true
      index -= 1
    } else {
      break
    }
  }

  if (!hasTrailingSymbols || requiresPrecedingSymbol) {
    return value
  }

  return characters.slice(0, index + 1).join('')
}
