import {describe, expect, test} from 'vitest'

import {createSeededRandom} from '../random'

describe('seeded random', () => {
  test('should repeat seeded random numbers within 0..1', () => {
    const first = createSeededRandom(7)
    const second = createSeededRandom(7)
    const values = Array.from({length: 100}, () => first())
    expect(values).toEqual(Array.from({length: 100}, () => second()))
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true)
    // The minimal standard generator's first output for seed 1.
    expect(createSeededRandom(1)()).toBeCloseTo(48_270 / 2_147_483_646, 12)
  })
})

test('should restore a random sequence checkpoint without replaying earlier samples', () => {
  const original = createSeededRandom(42)
  original()
  const state = original.capture()
  const expected = [original(), original(), original()]
  const restored = createSeededRandom(1)
  restored.restore(state)
  expect([restored(), restored(), restored()]).toEqual(expected)
})
