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
    expect(messages[1]?.content).toContain(TAROT_CARDS[0]!.readingMeaning.en)
    expect(messages[1]?.content).toContain(`Present: ${TAROT_CARDS[0]!.readingMeaning.en}`)
    expect(messages[1]?.content).not.toContain(TAROT_CARDS[0]!.name.en)
    expect(messages[1]?.content).not.toContain(TAROT_CARDS[0]!.meaning.en)
    expect(messages[1]?.content).toContain('What should I reflect on?')
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
    expect(content).not.toContain('지금 돌아볼 만한 것은 무엇인가요?')
  })

  it('should preserve past, present, and future positions for a question-free reading', () => {
    const cards = TAROT_CARDS.slice(0, 3).map((card) => ({
      ...card,
      orientation: 'upright' as const,
    }))
    const messages = createTarotMessages({cards, locale: 'ko', question: ''})
    const content = messages[1]?.content ?? ''

    expect(content).toContain(`과거: ${cards[0]?.readingMeaning.ko}`)
    expect(content).toContain(`현재: ${cards[1]?.readingMeaning.ko}`)
    expect(content).toContain(`미래: ${cards[2]?.readingMeaning.ko}`)
    expect(content).toContain('지금 돌아볼 만한 것은 무엇인가요?')
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
      expect(content).not.toContain(locale === 'ko' ? '역방향' : 'Reversed')
      expect(content).toContain(card.reversedReadingMeaning[locale])
      expect(content).not.toContain(card.readingMeaning[locale])
      expect(content).not.toContain(card.name[locale])
      expect(content).not.toContain(card.id)
      expect(content).not.toContain(card.reversedMeaning[locale])
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
          (card.orientation === 'reversed' ? card.reversedReadingMeaning : card.readingMeaning)[
            locale
          ],
        )
      })
      expect(lines[1]).not.toContain(cards[1]!.readingMeaning[locale])
      expect(content).toContain(locale === 'ko' ? '1,400~1,900자' : '550–750 words')
      expect(content).toContain(
        question ||
          (locale === 'ko'
            ? '지금 돌아볼 만한 것은 무엇인가요?'
            : 'What is worth reflecting on now?'),
      )
    },
  )

  it.each(
    (['ko', 'en'] as const).flatMap((locale) =>
      ([1, 3, 5] as const).map((count) => ({count, locale})),
    ),
  )(
    'should send only position meanings without card metadata for $count cards in $locale',
    ({count, locale}) => {
      const cards = TAROT_CARDS.slice(0, count).map((card, index) => ({
        ...card,
        id: `metadata-id-${index}`,
        meaning: {en: 'metadata-background', ko: 'metadata-background'},
        name: {en: `metadata-name-${index}`, ko: `metadata-name-${index}`},
        orientation: index === 0 ? ('reversed' as const) : ('upright' as const),
        reversedMeaning: {en: 'metadata-background', ko: 'metadata-background'},
      }))
      const messages = createTarotMessages({cards, locale, question: ''})
      const content = messages.map((message) => message.content).join('\n')
      expect(content).not.toContain('metadata-')
      expect(content).not.toMatch(/정방향|역방향|Upright|Reversed/i)
      const lines = messages[1]!.content.split('\n')
      const positions = count === 1 ? [locale === 'ko' ? '현재' : 'Present'] : undefined
      cards.forEach((card, index) => {
        const selected =
          card.orientation === 'reversed' ? card.reversedReadingMeaning : card.readingMeaning
        expect(lines.some((line) => line.endsWith(`: ${selected[locale]}`))).toBe(true)
        if (positions !== undefined) {
          expect(lines).toContain(`${positions[index]}: ${selected[locale]}`)
        }
      })
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
