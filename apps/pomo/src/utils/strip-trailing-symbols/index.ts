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

const getSymbolStart = (characters: readonly string[], index: number) => {
  const tagStartIndex = getTagStart(characters, index)
  const keycapBaseIndex = getKeycapBase(characters, index)

  if (TRAILING_SYMBOL_PATTERN.test(characters[index]!)) {
    return index
  }

  return tagStartIndex >= 0 ? tagStartIndex : keycapBaseIndex
}

/**
 * 문자열 끝의 Unicode Symbol 코드 포인트와 인접한 Unicode White_Space를 제거한다.
 * 키캡, 종료 문자가 있는 그림 태그, U+FE0E/FE0F/20E0 결합 문자, 기호 사이의 연결 문자를 지원한다.
 * 지원하지 않는 문자를 만나면 탐색을 멈춘다. 기호가 없거나 끝의 결합·연결 문자를 처리하지 못하면 입력을 유지한다.
 * 완전한 이모지 시퀀스인지 검증하지 않고 나머지 텍스트를 그대로 유지한다.
 */
export const stripTrailingSymbols = (value: string): string => {
  const characters = Array.from(value)
  let index = characters.length - 1
  let hasTrailingSymbols = false
  let requiresPrecedingSymbol = false

  while (index >= 0) {
    const character = characters[index]!
    const symbolStartIndex = getSymbolStart(characters, index)

    if (requiresPrecedingSymbol) {
      if (symbolStartIndex >= 0) {
        requiresPrecedingSymbol = false
        hasTrailingSymbols = true
        index = symbolStartIndex - 1
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
    } else if (symbolStartIndex >= 0) {
      hasTrailingSymbols = true
      index = symbolStartIndex - 1
    } else if (ATTACHED_MARK_PATTERN.test(character)) {
      requiresPrecedingSymbol = true
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
