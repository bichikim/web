/** @vitest-environment node */
import {expect, it} from 'vitest'

import {
  parseLanguageLearningWordSourcePreference,
  readLanguageLearningWordSource,
} from '../features/language-learning/word-source-storage'
import {writeWebStorageJson} from '../utils/runtime-storage'

const STORAGE_KEY = 'pomo:language-learning:word-source:v1'

it('should restore saved word source when version field is missing from stored JSON', () => {
  writeWebStorageJson(STORAGE_KEY, {source: 'saved'})

  expect(parseLanguageLearningWordSourcePreference({source: 'saved'})).toEqual('saved')
  expect(readLanguageLearningWordSource()).toBe('saved')
})
