/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {
  containsForeignCjk,
  createKoreanTextSegments,
  replaceUnrefinedSentences,
} from '../features/korean-text-postprocessor'

describe('Korean middle dot should not be treated as foreign CJK', () => {
  it.each(['국어·영어·수학을 공부해요.', '그는 「시작」이라고 말했어요.', '1~2분 쉬어요〜'])(
    'should not flag Korean punctuation as foreign CJK: %s',
    (text) => {
      expect(containsForeignCjk(text)).toBe(false)
      expect(createKoreanTextSegments(text)).toEqual([{kind: 'text', text}])
    },
  )

  it('should keep a clean sentence containing a middle dot', () => {
    expect(replaceUnrefinedSentences('좋아요. 국어·영어·수학을 공부해요.')).toBe(
      '좋아요. 국어·영어·수학을 공부해요.',
    )
  })
})
