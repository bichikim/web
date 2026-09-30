import {expect, it} from 'vitest'

import {MAXIMUM_LANGUAGE_LEARNING_TAG_LENGTH, parseLanguageLearningTags} from '../tags'

it('should discard empty values and preserve the first casing after trimming', () => {
  expect(parseLanguageLearningTags(' ,\n ')).toEqual([])
  expect(parseLanguageLearningTags(' Home,HOME\n home,Work ')).toEqual(['Home', 'Work'])
})

it('should deduplicate after truncation and count only unique tags toward the limit', () => {
  const prefix = 'X'.repeat(30)
  expect(parseLanguageLearningTags(`${prefix}first,${prefix}second,a,A,b,c,d,e,f,g,h,i,j`)).toEqual(
    [prefix, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
  )
})

it('should preserve a surrogate-pair emoji at the maximum grapheme length', () => {
  const tag = `${'a'.repeat(MAXIMUM_LANGUAGE_LEARNING_TAG_LENGTH - 1)}😀`

  expect(parseLanguageLearningTags(tag)).toEqual([tag])
})

it('should truncate after a complete combined emoji grapheme', () => {
  const prefix = 'a'.repeat(MAXIMUM_LANGUAGE_LEARNING_TAG_LENGTH - 1)
  const emoji = '👨‍👩‍👧‍👦'

  expect(parseLanguageLearningTags(`${prefix}${emoji}b`)).toEqual([`${prefix}${emoji}`])
})
