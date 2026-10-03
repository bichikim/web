/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseLanguageLearningTags} from 'src/features/language-learning/tags'

it('should split tags on carriage returns used in classic Mac and spreadsheet paste', () => {
  expect(parseLanguageLearningTags('home\rwork')).toEqual(['home', 'work'])
  expect(parseLanguageLearningTags(' first\rsecond\rthird ')).toEqual(['first', 'second', 'third'])
})
