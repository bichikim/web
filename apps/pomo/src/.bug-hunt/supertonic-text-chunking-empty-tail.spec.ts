/** @vitest-environment node */

import {describe, expect, it} from 'vitest'

import type {SupertonicSpeechPolicy} from '../features/supertonic/model'
import {splitSpeechText} from '../features/supertonic/text-chunking'

const POLICY: SupertonicSpeechPolicy = {
  considerSplitLength: 1,
  locale: 'ko',
  maximumLength: 5,
  recommendedLength: 6,
  silenceDuration: 0.3,
}

describe('splitSpeechText oversized hard splits', () => {
  it('should not emit empty chunks after a hard maximum-length split', () => {
    const chunks = splitSpeechText('가가가가가가', POLICY)

    expect(chunks.every((chunk) => chunk.length > 0)).toBe(true)
  })
})
