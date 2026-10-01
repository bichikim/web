import {describe, expect, it} from 'vitest'
import {TAROT_CARDS} from '../cards'
import {createTarotMessages} from '../prompt'

describe('createTarotMessages', () => {
  it('should connect a one-card English reading to the question using the prewritten card description', () => {
    const messages = createTarotMessages({
      cards: [{...TAROT_CARDS[0]!, orientation: 'upright'}],
      locale: 'en',
      question: 'What should I reflect on?',
    })

    expect(messages).toHaveLength(2)
    expect(messages[0]?.role).toBe('system')
    expect(messages[0]?.content).toContain('English')
    expect(messages[1]?.content).toContain(TAROT_CARDS[0]!.meaning.en)
    expect(messages[1]?.content).toContain(TAROT_CARDS[0]!.name.en)
    expect(messages[1]?.content).toContain('What should I reflect on?')
    expect(messages[1]?.content).toContain('First, answer tentatively')
    expect(messages[1]?.content).toContain('apply the drawn card meaning to the question')
  })

  it('should put a Korean decision question before the three card positions', () => {
    const cards = TAROT_CARDS.slice(0, 3).map((card) => ({
      ...card,
      orientation: 'upright' as const,
    }))
    const messages = createTarotMessages({
      cards,
      locale: 'ko',
      question: '이직해야 하나요?',
    })
    const content = messages[1]?.content ?? ''

    expect(content.indexOf('질문: 이직해야 하나요?')).toBeLessThan(content.indexOf('과거:'))
    expect(content).toContain('첫 문장에서 잠정적으로 답하고')
    expect(content).toContain('과거·현재·미래의 의미를 질문에 연결')
    expect(content).toContain('다른 쪽이 나을 조건도 비교하세요')
    expect(content).toContain('결정 전에 확인할 구체적인 조건')
    expect(content).not.toContain('지금 돌아볼 만한 것은 무엇인가요?')
  })

  it('should preserve past, present, and future positions for a question-free reading', () => {
    const cards = TAROT_CARDS.slice(0, 3).map((card) => ({
      ...card,
      orientation: 'upright' as const,
    }))
    const messages = createTarotMessages({cards, locale: 'ko', question: ''})
    const content = messages[1]?.content ?? ''

    expect(content).toContain(`과거: 정방향: ${cards[0]?.meaning.ko}`)
    expect(content).toContain(`현재: 정방향: ${cards[1]?.meaning.ko}`)
    expect(content).toContain(`미래: 정방향: ${cards[2]?.meaning.ko}`)
    expect(content).toContain('지금 돌아볼 만한 것은 무엇인가요?')
    expect(content).not.toContain('첫 문장에서 잠정적으로 답하고')
  })

  it.each(['ko', 'en'] as const)(
    'should send only the drawn orientation meaning in %s',
    (locale) => {
      const card = TAROT_CARDS[0]!
      const content = createTarotMessages({
        cards: [{...card, orientation: 'reversed'}],
        locale,
        question: '질문',
      })[1]!.content
      expect(content).toContain(locale === 'ko' ? '역방향:' : 'Reversed:')
      expect(content).toContain(card.reversedMeaning[locale])
      expect(content).not.toContain(card.meaning[locale])
      expect(content).toContain(card.name[locale])
      expect(content).not.toContain(card.id)
    },
  )

  it.each([
    {locale: 'ko' as const, question: '새로운 일을 시작할까요?'},
    {locale: 'ko' as const, question: ''},
    {locale: 'en' as const, question: 'Should I start something new?'},
    {locale: 'en' as const, question: ''},
  ])(
    'should connect five positions and drawn meanings in $locale with question "$question"',
    ({locale, question}) => {
      const cards = TAROT_CARDS.slice(0, 5).map((card, index) => ({
        ...card,
        orientation: index === 1 ? ('reversed' as const) : ('upright' as const),
      }))
      const content = createTarotMessages({cards, locale, question})[1]!.content
      const positions =
        locale === 'ko'
          ? ['현재 상황', '막히는 점', '도움이 되는 점', '조언', '예상 흐름']
          : ['Current situation', 'Obstacle', 'Support', 'Advice', 'Possible outcome']
      const lines = content
        .split('\n')
        .filter((line) => positions.some((position) => line.startsWith(`${position}:`)))
      expect(lines).toHaveLength(5)
      cards.forEach((card, index) => {
        expect(lines[index]).toMatch(new RegExp(`^${positions[index]}:`))
        expect(lines[index]).toContain(
          (card.orientation === 'reversed' ? card.reversedMeaning : card.meaning)[locale],
        )
      })
      expect(lines[1]).not.toContain(cards[1]!.meaning[locale])
      expect(content).toContain(locale === 'ko' ? '1,400~1,900자' : '550–750 words')
      expect(content).toContain(
        question ||
          (locale === 'ko'
            ? '지금 돌아볼 만한 것은 무엇인가요?'
            : 'What is worth reflecting on now?'),
      )
    },
  )

  it.each([0, 2, 4, 6])('should reject unsupported readings with %s cards', (count) => {
    const cards = TAROT_CARDS.slice(0, count).map((card) => ({
      ...card,
      orientation: 'upright' as const,
    }))
    expect(() => createTarotMessages({cards, locale: 'ko', question: ''})).toThrow(
      'one, three, or five',
    )
  })
})
