import {describe, expect, it} from 'vitest'

import {findInsufficiencyThreshold} from 'scripts/text-mood/train.mjs'

const row = (probability, sufficient) => ({embedding: [probability], sufficient})
const predict = ([probability]) => probability

describe('findInsufficiencyThreshold', () => {
  it('selects a threshold only when validation precision remains conservative', () => {
    const selection = findInsufficiencyThreshold(
      [row(0.62, true), row(0.96, false), row(0.98, false)],
      predict,
    )

    expect(selection).toMatchObject({precision: 1, recall: 1, threshold: 0.94})
  })

  it('rejects configurations without a high-precision threshold', () => {
    const selection = findInsufficiencyThreshold(
      [row(0.99, true), row(0.98, false), row(0.97, false)],
      predict,
    )

    expect(selection).toBeNull()
  })
})
