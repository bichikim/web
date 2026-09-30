/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseLanguageLearningTags} from '../features/language-learning/tags'

const FULLWIDTH_COMMA = '\uFF0C'

it('should split tags on the fullwidth comma used in Korean IME input', () => {
  expect(parseLanguageLearningTags(`home${FULLWIDTH_COMMA}work`)).toEqual(['home', 'work'])
})
