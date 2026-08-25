import {describe, expect, it} from 'vitest'

import {createDirectAnswerMessages} from '../prompt'

describe('createDirectAnswerMessages', () => {
  it('should keep only the Korean paragraph instruction and user request', () => {
    const messages = createDirectAnswerMessages({
      request: '  삶의 행복에 대해 이야기해줘  ',
    })

    expect(messages).toEqual([
      {
        content: '사용자의 요청에 답하는 자연스러운 한국어 본문 한 문단을 쓰세요.',
        role: 'system',
      },
      {content: '삶의 행복에 대해 이야기해줘', role: 'user'},
    ])
  })
})
