import {expect, it} from 'vitest'
import {TAROT_ARTWORK} from '../artwork'
import {TAROT_CARDS} from '../cards'

it('should provide a distinct image and localized marker for every card in the deck', () => {
  const artwork = TAROT_CARDS.map((card) => TAROT_ARTWORK[card.id])

  expect(artwork).toHaveLength(78)
  expect(artwork.every((item) => item?.image && item.marker.en && item.marker.ko)).toBe(true)
  expect(new Set(artwork.map((item) => item?.image)).size).toBe(78)
})
