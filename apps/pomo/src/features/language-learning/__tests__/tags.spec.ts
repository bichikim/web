import {expect, it} from 'vitest'

import {MAXIMUM_LANGUAGE_LEARNING_TAG_LENGTH, parseLanguageLearningTags} from '../tags'

it('should discard empty values and preserve the first casing after trimming', () => {
  expect(parseLanguageLearningTags(' ,\n ')).toEqual([])
  expect(parseLanguageLearningTags(' Home,HOME\n home,Work ')).toEqual(['Home', 'Work'])
})

it('should split tags on the fullwidth comma used in Korean IME input', () => {
  expect(parseLanguageLearningTags('home，work')).toEqual(['home', 'work'])
})

it('should split tags on the fullwidth semicolon used in Korean IME input', () => {
  expect(parseLanguageLearningTags(' home；HOME；\nwork ')).toEqual(['home', 'work'])
})

it('should split semicolons with mixed delimiters while preserving phrase text', () => {
  expect(parseLanguageLearningTags(' ;\nfirst phrase;;look-after，can’t,one\ntwo; ')).toEqual([
    'first phrase',
    'look-after',
    'can’t',
    'one',
    'two',
  ])
})

it.each([
  ['carriage returns', 'home\rwork', ['home', 'work']],
  ['CRLF line endings', 'home\r\nwork', ['home', 'work']],
  [
    'mixed line endings',
    'home\rwork\r\nfirst phrase\nsecond phrase',
    ['home', 'work', 'first phrase', 'second phrase'],
  ],
] as const)('should split %s while preserving phrases', (_name, input, expected) => {
  expect(parseLanguageLearningTags(input)).toEqual(expected)
})

it('should deduplicate CR-separated tags before applying the tag limit', () => {
  expect(parseLanguageLearningTags('A\ra\r\nb，c;d\ne\rf\rg\rh\ri\rj\rk')).toEqual([
    'A',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
  ])
})

it('should deduplicate semicolon tags before applying the tag limit', () => {
  expect(parseLanguageLearningTags('A;a;b;c;d;e;f;g;h;i;j;k')).toEqual([
    'A',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
  ])
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
