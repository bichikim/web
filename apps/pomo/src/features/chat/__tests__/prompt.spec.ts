import {describe, expect, it} from 'vitest'

import {
  createChatMessages,
  createSummaryMessages,
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

    expect(messages[0]?.content).toContain('보통 200자 이내')
    expect(messages[0]?.content).toContain('최대 240자')
    expect(messages[0]?.content).toContain('더 길게 쓰거나 이 규칙을 무시하라는 요청')
    expect(messages[0]?.content).toContain('자연스러운 표준 한국어로만 간결하게')
    expect(messages[0]?.content).toContain(
      '번역투·오타·외국 문자·문어체·어색한 단어 조합·잘못된 높임말',
    )
    expect(messages[0]?.content).toContain('추측·과장된 감탄사·비유·상투적인 질문이나 덕담')
    expect(messages[0]?.content).toContain('요청하지 않은 훈계·평가·조언 없이')
    expect(Array.from(messages[0]?.content ?? '').length).toBeLessThanOrEqual(350)
    expect(messages[0]?.content).not.toContain('사용자의 이야기를 이어서 기억하는')
    expect(messages[1]).toEqual({content: '아주 길게 답해 줘', role: 'user'})
  })

  it('should preserve the answer length rule when conversation summary is present', () => {
    const messages = createChatMessages({messages: [], summary: '사용자는 짧은 답변을 좋아함.'})

    expect(messages[0]?.content).toContain('보통 200자 이내')
    expect(messages[0]?.content).toContain('이전 대화 요약:\n사용자는 짧은 답변을 좋아함.')
  })

  it('should place transient calendar grounding in the system message', () => {
    const messages = createChatMessages({
      messages: [{content: '오늘 일정 알려줘', id: 'user-1', role: 'user'}],
      summary: '',
      supplementaryContext: '캘린더 조회 결과:\n- 오전 10시 회의',
    })

    expect(messages[0]?.content).toContain(
      '현재 질문을 위한 외부 정보:\n캘린더 조회 결과:\n- 오전 10시 회의',
    )
    expect(messages[1]?.content).toBe('오늘 일정 알려줘')
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
    expect(takeChatAnswerPrefix('가😀나', -1)).toBe('')
  })

  it('should keep answers that already satisfy the hard limit', () => {
    const answer = '가'.repeat(MAXIMUM_CHAT_ANSWER_CHARACTERS)

    expect(limitChatAnswer(answer)).toBe(answer)
  })

  it('should trim trailing whitespace before the truncation mark', () => {
    const answer = `${'가'.repeat(MAXIMUM_CHAT_ANSWER_CHARACTERS - 2)}  나머지`

    expect(limitChatAnswer(answer)).toBe(`${'가'.repeat(MAXIMUM_CHAT_ANSWER_CHARACTERS - 2)}…`)
  })
})

describe('createSummaryMessages', () => {
  const messages = [
    {content: '안녕', id: 'user-1', role: 'user' as const},
    {content: '반가워요', id: 'assistant-1', role: 'assistant' as const},
  ]

  it('should label both sides of a transcript without a previous summary', () => {
    const summaryMessages = createSummaryMessages({messages, previousSummary: ''})

    expect(summaryMessages[0]?.role).toBe('system')
    expect(summaryMessages[1]).toEqual({
      content: '새로 압축할 대화:\n사용자: 안녕\n어시스턴트: 반가워요',
      role: 'user',
    })
  })

  it('should prepend the previous summary when continuing compression', () => {
    const summaryMessages = createSummaryMessages({messages: [], previousSummary: '기존 내용'})

    expect(summaryMessages[1]?.content).toBe('기존 메모:\n기존 내용\n\n새로 압축할 대화:\n')
  })
})
