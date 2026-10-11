/** @vitest-environment node */
import {expect, it} from 'vitest'

import {normalizeKoreanSpeechStyle} from '../features/dialogue-writer/answer'

it('should normalize 해보라 at the end of a sentence like other informal command endings', () => {
  expect(normalizeKoreanSpeechStyle('한번 생각해보라')).toBe('한번 생각해 보세요')
})
