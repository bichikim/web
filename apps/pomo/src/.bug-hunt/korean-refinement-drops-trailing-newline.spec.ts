/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {
  createKoreanTextSegments,
  replaceUnrefinedSentences,
} from '../features/korean-text-postprocessor/logic'

describe('korean refinement newline preservation', () => {
  it('should preserve trailing newlines after replacing a contaminated list item', () => {
    const input = '- 항목 人生\n- 다음 항목\n- 셋째'

    expect(createKoreanTextSegments(input)).toEqual([
      {kind: 'refining', text: '- 항목 人生\n'},
      {kind: 'text', text: '- 다음 항목\n'},
      {kind: 'text', text: '- 셋째'},
    ])

    expect(replaceUnrefinedSentences(input)).toBe(
      '답변의 일부 표현을 자연스러운 한국어로 바꾸지 못했어요.\n- 다음 항목\n- 셋째',
    )
  })

  it('should preserve paragraph breaks after replacing a contaminated numbered line', () => {
    const input = '1. 첫째 人生이에요.\n2. 둘째예요.\n\n마무리예요.'

    expect(replaceUnrefinedSentences(input)).toBe(
      '답변의 일부 표현을 자연스러운 한국어로 바꾸지 못했어요.\n2. 둘째예요.\n\n마무리예요.',
    )
  })
})
