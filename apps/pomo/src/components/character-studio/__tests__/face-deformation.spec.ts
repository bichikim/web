/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {applyFaceDeformation, FACE_CONTROLS} from '../face-deformation'

describe('applyFaceDeformation', () => {
  it('should apply each endpoint and restore the reference shape without altering expressions', () => {
    for (const control of FACE_CONTROLS) {
      const targets = [
        {influence: 0, name: `PomoFace:${control.id}:plus`},
        {influence: 0, name: `PomoFace:${control.id}:minus`},
        {influence: 0.6, name: 'Fcl_MTH_A'},
      ]
      const container = {
        meshes: [
          {
            morphTargetManager: {
              getTarget: (index: number) => targets[index]!,
              numTargets: targets.length,
            },
          },
        ],
      }
      applyFaceDeformation(container, {[control.id]: 1})
      expect(targets.map((target) => target.influence)).toEqual([
        control.initial < 1 ? 1 : 0,
        0,
        0.6,
      ])
      applyFaceDeformation(container, {[control.id]: control.min})
      expect(targets.map((target) => target.influence)).toEqual([
        0,
        control.min < control.initial ? 1 : 0,
        0.6,
      ])
      applyFaceDeformation(container)
      expect(targets.map((target) => target.influence)).toEqual([0, 0, 0.6])
    }
  })
  it('should tolerate missing morph targets and clamp invalid values', () => {
    expect(() => applyFaceDeformation(null)).not.toThrow()
    expect(() => applyFaceDeformation({meshes: [{}]})).not.toThrow()
    const target = {influence: 0, name: 'PomoFace:ear-size:plus'}
    const container = {meshes: [{morphTargetManager: {getTarget: () => target, numTargets: 1}}]}
    applyFaceDeformation(container, {'ear-size': 5})
    expect(target.influence).toBe(1)
    applyFaceDeformation(container, {'ear-size': Number.NaN})
    expect(target.influence).toBe(0)
  })
})
