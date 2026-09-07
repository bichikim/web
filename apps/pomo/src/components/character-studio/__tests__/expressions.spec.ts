import {describe, expect, it} from 'vitest'
import {applyExpressions} from '../expressions'

describe('applyExpressions', () => {
  it('should combine emotion mouth and blink while preserving eye proportions', () => {
    const targets = [
      'Fcl_ALL_Joy',
      'Fcl_ALL_Angry',
      'Fcl_MTH_A',
      'Fcl_MTH_O',
      'Fcl_EYE_Close',
      'PomoEyeNarrowing',
    ].map((name) => ({influence: 0.3, name}))
    const manager = {getTarget: (index: number) => targets[index]!, numTargets: targets.length}
    applyExpressions(
      {meshes: [{morphTargetManager: manager}]},
      {blink: 0.2, emotion: 'Joy', emotionWeight: 0.7, mouth: 'A', mouthWeight: 0.8},
    )
    expect(targets.map((target) => target.influence)).toEqual([0.7, 0, 0.8, 0, 0.2, 0.3])
    applyExpressions({meshes: [{morphTargetManager: manager}]})
    expect(targets.map((target) => target.influence)).toEqual([0, 0, 0, 0, 0, 0.3])
  })
  it('should tolerate unloaded models and meshes without morph targets', () => {
    expect(() => applyExpressions(null)).not.toThrow()
    expect(() => applyExpressions({meshes: [{}]})).not.toThrow()
  })
})
