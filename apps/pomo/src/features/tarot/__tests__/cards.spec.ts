import {describe, expect, it} from 'vitest'
import {drawTarotCards, TAROT_CARDS} from '../cards'

describe('tarot cards', () => {
  it('should contain 78 distinct cards with meanings for both orientations and languages', () => {
    expect(TAROT_CARDS).toHaveLength(78)
    expect(new Set(TAROT_CARDS.map((card) => card.id)).size).toBe(78)
    expect(TAROT_CARDS.filter((card) => card.arcana === 'major')).toHaveLength(22)
    expect(TAROT_CARDS.filter((card) => card.arcana === 'minor')).toHaveLength(56)

    for (const card of TAROT_CARDS) {
      expect(card.name.ko.trim()).not.toBe('')
      expect(card.name.en.trim()).not.toBe('')
      expect(card.meaning.ko.trim()).not.toBe('')
      expect(card.meaning.en.trim()).not.toBe('')
      expect(card.reversedMeaning.ko.trim()).not.toBe('')
      expect(card.reversedMeaning.en.trim()).not.toBe('')
      expect(card.reversedMeaning.ko).not.toBe(card.meaning.ko)
      expect(card.reversedMeaning.en).not.toBe(card.meaning.en)
      for (const locale of ['ko', 'en'] as const) {
        expect(card.meaning[locale]).toContain(card.name[locale])
        expect(card.reversedMeaning[locale]).toContain(card.name[locale])
        expect(card.meaning[locale]).toContain(locale === 'ko' ? '정방향:' : 'Upright:')
        expect(card.reversedMeaning[locale]).toContain(locale === 'ko' ? '역방향:' : 'Reversed:')
      }
    }
  })

  it('should draw one card from the full deck', () => {
    expect(drawTarotCards({count: 1, random: () => 0})).toEqual([
      {...TAROT_CARDS[0], orientation: 'upright'},
    ])
  })

  it('should draw three distinct cards in draw order without changing the deck', () => {
    const cards = drawTarotCards({count: 3, random: () => 0})

    expect(cards).toEqual(
      TAROT_CARDS.slice(0, 3).map((card) => ({...card, orientation: 'upright'})),
    )
    expect(new Set(cards.map((card) => card.id)).size).toBe(3)
    expect(TAROT_CARDS).toHaveLength(78)
  })

  it('should draw five distinct cards with independent orientations without changing the deck', () => {
    const values = [0, 0.2, 0, 0.8, 0, 0.2, 0, 0.8, 0, 0.2]
    const cards = drawTarotCards({count: 5, random: () => values.shift()!})
    expect(cards.map((card) => card.id)).toEqual(TAROT_CARDS.slice(0, 5).map((card) => card.id))
    expect(cards.map((card) => card.orientation)).toEqual([
      'upright',
      'reversed',
      'upright',
      'reversed',
      'upright',
    ])
    expect(new Set(cards.map((card) => card.id)).size).toBe(5)
    expect(TAROT_CARDS).toHaveLength(78)
    expect(TAROT_CARDS[0]).not.toHaveProperty('orientation')
  })

  it('should draw the orientation independently at the midpoint without changing the catalog', () => {
    const values = [0, 0.49, 0, 0.5, 0, 0.99]
    const cards = drawTarotCards({count: 3, random: () => values.shift()!})
    expect(cards.map((card) => card.id)).toEqual(TAROT_CARDS.slice(0, 3).map((card) => card.id))
    expect(cards.map((card) => card.orientation)).toEqual(['upright', 'reversed', 'reversed'])
    expect(TAROT_CARDS[0]).not.toHaveProperty('orientation')
  })
})

it('should precompose the major number and minor suit and rank symbolism in both directions', () => {
  const fool = TAROT_CARDS[0]!
  const king = TAROT_CARDS.find((card) => card.id === 'pentacles-king')!
  for (const meaning of [fool.meaning, fool.reversedMeaning]) {
    expect(meaning.ko).toContain('메이저 아르카나 0번')
    expect(meaning.en).toContain('Major Arcana number 0')
  }
  for (const meaning of [king.meaning, king.reversedMeaning]) {
    expect(meaning.ko).toContain('마이너 아르카나')
    expect(meaning.ko).toContain('펜타클 슈트')
    expect(meaning.ko).toContain('왕 등급')
    expect(meaning.en).toContain('Minor Arcana')
    expect(meaning.en).toContain('Pentacles suit')
    expect(meaning.en).toContain('King represents')
  }
})
