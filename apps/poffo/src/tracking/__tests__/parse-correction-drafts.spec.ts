import {expect, test} from 'vitest'
import {parseCorrectionDrafts} from '../parse-correction-drafts'
test('should accept absent drafts and unique standalone correction identifiers', () => {
  expect(parseCorrectionDrafts({parameters: [], value: undefined})).toEqual([])
  expect(parseCorrectionDrafts({parameters: [], value: ['draft:one']})).toEqual(['draft:one'])
})
test.each([
  {value: ['draft:one', 'draft:one']},
  {value: ['draft:']},
  {value: ['other']},
  {value: [1]},
])('should reject invalid or duplicate draft identifiers $value', (scenario) => {
  expect(parseCorrectionDrafts({parameters: [], value: scenario.value})).toBeUndefined()
})
