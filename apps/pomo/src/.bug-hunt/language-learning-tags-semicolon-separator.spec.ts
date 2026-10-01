/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseLanguageLearningTags} from 'src/features/language-learning/tags'

it('should split direct-input tags on semicolons used by spreadsheet paste', () => {
  expect(parseLanguageLearningTags('one;two;three')).toEqual(['one', 'two', 'three'])
  expect(parseLanguageLearningTags('one; two ; three')).toEqual(['one', 'two', 'three'])
})
