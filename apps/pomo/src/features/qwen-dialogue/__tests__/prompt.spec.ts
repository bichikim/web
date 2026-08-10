import {describe, expect, it} from 'vitest'

import {createDirectAnswerMessages} from '../prompt'

describe('createDirectAnswerMessages', () => {
  it('should create a stateless Korean long-form direct answer request', () => {
    const messages = createDirectAnswerMessages({
      request: '  삶의 행복에 대해 이야기해줘  ',
    })

    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({role: 'system'})
    expect(messages[0]?.content).toContain('한국어 본문 한 문단')
    expect(messages[0]?.content).toContain('처음부터 끝까지 해요체')
    expect(messages[0]?.content).toContain('알파벳이나 한자는 뜻이 같은 한글 낱말로 바꾸고')
    expect(messages[0]?.content).toContain('300~500자')
    expect(messages[0]?.content).not.toMatch(/A\/B|인터뷰|문답|화자 이름/)
    expect(messages[1]).toEqual({
      content: '삶의 행복에 대해 이야기해줘\n\n한글 해요체로 된 답변 본문 한 문단만 작성하세요.',
      role: 'user',
    })
  })
})
