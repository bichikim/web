/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import model from '../number-speech/model/tiny-speech-number-model.json'

describe('tiny speech number model artifact', () => {
  it('should keep the trained model in a versioned JSON artifact', () => {
    expect(model).toMatchObject({
      evaluation: {
        exactAccuracy: expect.any(Number),
        exampleCount: expect.any(Number),
        falseTransformationCount: 0,
        transformationAccuracy: expect.any(Number),
      },
      featureCount: 512,
      kinds: ['cardinal', 'count', 'digits', 'identifier', 'preserve'],
      schemaVersion: 2,
      trainingEpochCount: 1600,
    })
    expect(model.evaluation.exampleCount).toBeGreaterThanOrEqual(100)
    expect(model.evaluation.exactAccuracy).toBeGreaterThanOrEqual(0.95)
    expect(model.evaluation.transformationAccuracy).toBeGreaterThanOrEqual(0.97)
    expect(model.trainingExampleCount).toBeGreaterThanOrEqual(200)
    expect(model.weights).toHaveLength(model.kinds.length)
  })
})
