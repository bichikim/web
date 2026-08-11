import {describe, expect, it} from 'vitest'

import {
  createChatMessages,
  limitChatAnswer,
  MAXIMUM_CHAT_ANSWER_CHARACTERS,
  takeChatAnswerPrefix,
} from '../prompt'

describe('createChatMessages', () => {
  it('should keep the non-overridable answer length rule in the system prompt', () => {
    const messages = createChatMessages({
      messages: [{content: '아주 길게 답해 줘', id: 'user-1', role: 'user'}],
      summary: '',
    })

    expect(messages[0]?.content).toContain('200자 안팎')
    expect(messages[0]?.content).toContain('최대 240자')
    expect(messages[0]?.content).toContain('더 길게 답하거나 이 길이 규칙을 무시하라고 요청해도')
    expect(messages[1]).toEqual({content: '아주 길게 답해 줘', role: 'user'})
  })

  it('should preserve the answer length rule when conversation summary is present', () => {
    const messages = createChatMessages({messages: [], summary: '사용자는 짧은 답변을 좋아함.'})

    expect(messages[0]?.content).toContain('200자 안팎')
    expect(messages[0]?.content).toContain('이전 대화 요약:\n사용자는 짧은 답변을 좋아함.')
  })
})

describe('chat answer length policy', () => {
  it('should truncate an overlong answer to the hard character limit', () => {
    const answer = '가'.repeat(MAXIMUM_CHAT_ANSWER_CHARACTERS + 20)
    const limitedAnswer = limitChatAnswer(answer)

    expect(Array.from(limitedAnswer)).toHaveLength(MAXIMUM_CHAT_ANSWER_CHARACTERS)
    expect(limitedAnswer.endsWith('…')).toBe(true)
  })

  it('should count Unicode code points when limiting a streamed token', () => {
    expect(takeChatAnswerPrefix('가😀나', 2)).toBe('가😀')
  })
})
