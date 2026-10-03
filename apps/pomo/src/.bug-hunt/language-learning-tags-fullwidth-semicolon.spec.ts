/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseLanguageLearningTags} from '../features/language-learning/tags'

it('should split direct-input tags on fullwidth semicolons like fullwidth commas', () => {
  expect(parseLanguageLearningTags('one；two；three')).toEqual(['one', 'two', 'three'])
})
