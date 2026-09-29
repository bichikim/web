/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {parseLanguageLearningTags} from '../features/language-learning/tags'

describe('language learning tag parsing', () => {
  it('should not split a grapheme when truncating to the maximum tag length', () => {
    const input = `${'a'.repeat(29)}😀`
    const [tag] = parseLanguageLearningTags(input)

    expect(tag).toBe(input)
    expect([...tag!].at(-1)).toBe('😀')
  })
})
