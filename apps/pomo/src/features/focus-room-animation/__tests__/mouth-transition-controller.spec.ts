import {describe, expect, it} from 'vitest'

import {
  getPVisemeTransitionProgress,
  P_MOUTH_TRANSITION_DURATION_MS,
} from '../mouth-transition-controller'

describe('getPVisemeTransitionProgress', () => {
  it('eases from the current mouth to the next over the co-articulation window', () => {
    expect(getPVisemeTransitionProgress(0)).toBe(0)
    expect(getPVisemeTransitionProgress(P_MOUTH_TRANSITION_DURATION_MS / 2)).toBe(0.5)
    expect(getPVisemeTransitionProgress(P_MOUTH_TRANSITION_DURATION_MS)).toBe(1)
  })

  it('clamps timestamps outside the transition window', () => {
    expect(getPVisemeTransitionProgress(-1)).toBe(0)
    expect(getPVisemeTransitionProgress(P_MOUTH_TRANSITION_DURATION_MS + 1)).toBe(1)
  })
})
