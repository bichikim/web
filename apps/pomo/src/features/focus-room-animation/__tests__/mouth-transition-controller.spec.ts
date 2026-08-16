import {describe, expect, it} from 'vitest'

import {P_VISEME_COARTICULATION_MS} from '../../lip-sync'
import {getPVisemeTransitionProgress} from '../mouth-transition-controller'

describe('getPVisemeTransitionProgress', () => {
  it('eases from the current mouth to the next over the co-articulation window', () => {
    expect(getPVisemeTransitionProgress(0)).toBe(0)
    expect(getPVisemeTransitionProgress(P_VISEME_COARTICULATION_MS / 2)).toBe(0.5)
    expect(getPVisemeTransitionProgress(P_VISEME_COARTICULATION_MS)).toBe(1)
  })

  it('clamps timestamps outside the transition window', () => {
    expect(getPVisemeTransitionProgress(-1)).toBe(0)
    expect(getPVisemeTransitionProgress(P_VISEME_COARTICULATION_MS + 1)).toBe(1)
  })
})
