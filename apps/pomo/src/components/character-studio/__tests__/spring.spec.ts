import {describe, expect, it} from 'vitest'
import {applySpringSettings} from '../spring'

describe('applySpringSettings', () => {
  it('should apply independent proportion and face weights and preserve unrelated targets', () => {
    const targets = [
      {influence: 0, name: 'SpringProportions'},
      {influence: 0, name: 'SpringFaceWidth'},
      {influence: 0.4, name: 'Fcl_MTH_A'},
    ]
    const container = {
      meshes: [
        {
          morphTargetManager: {
            getTarget: (index: number) => targets[index]!,
            numTargets: targets.length,
          },
        },
        {morphTargetManager: null},
      ],
    }
    applySpringSettings(container, {faceWidth: 0.3, proportions: 1})
    expect(targets.map((target) => target.influence)).toEqual([1, 0.3, 0.4])
    applySpringSettings(container, {faceWidth: 0, proportions: 0})
    expect(targets.map((target) => target.influence)).toEqual([0, 0, 0.4])
    expect(() => applySpringSettings(null)).not.toThrow()
  })
})
