import {describe, expect, test} from 'vitest'

import source from '../../../../examples/development-model.json?raw'
import {composeParameterScene, composeParameterVertices} from '../../../deformation'
import {parseDocument} from '../../parse-document'
import {createPhysicsState, evaluatePhysics} from '../physics'
import {applySceneDeformers} from '../scene-deformation'

const parsed = parseDocument(source)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document

describe('development model hanging chest ribbons', () => {
  test.each(['body', 'full-body'])(
    'should trail %s motion, rebound gently, then settle',
    (input) => {
      let physicsState = createPhysicsState(model)
      const frames = Array.from({length: 360}, () => {
        const result = evaluatePhysics({
          deltaTime: 1 / 60,
          document: model,
          parameterValues: {[`${input}-x`]: 5},
          physicsState,
        })
        physicsState = result.physicsState
        return result.parameterValues
      })
      for (const side of ['left', 'right']) {
        const values = frames.map((frame) => frame[`ribbon-physics-${side}-${input}-x`]!)
        expect(values[0]).toBeLessThan(-0.4)
        expect(Math.max(...values)).toBeGreaterThan(0.05)
        expect(Math.max(...values)).toBeLessThan(0.2)
        expect(values.at(-1)).toBeCloseTo(0, 4)
        const otherInput = input === 'body' ? 'full-body' : 'body'
        expect(frames.every((frame) => frame[`ribbon-physics-${side}-${otherInput}-x`] === 0)).toBe(
          true,
        )
      }
    },
  )
})
