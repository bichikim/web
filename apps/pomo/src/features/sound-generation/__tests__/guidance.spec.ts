/** @vitest-environment node */
import {expect, it} from 'vitest'
import {createClassifierFreeGuidedVelocity, createNegativePromptGuidedVelocity} from '../guidance'

it('should remove the parallel guidance component that amplifies the conditioned sound', () => {
  const velocity = createClassifierFreeGuidedVelocity({
    apgScale: 1,
    cfgScale: 3,
    latent: new Float32Array([10, 10]),
    negativeVelocity: new Float32Array([0, 0]),
    positiveVelocity: new Float32Array([1, 1]),
    timestep: 1,
  })

  expect(Array.from(velocity)).toEqual([1, 1])
})

it('should preserve guidance that is orthogonal to the conditioned sound', () => {
  const velocity = createClassifierFreeGuidedVelocity({
    apgScale: 1,
    cfgScale: 3,
    latent: new Float32Array([10, 10]),
    negativeVelocity: new Float32Array([1, 0]),
    positiveVelocity: new Float32Array([1, 1]),
    timestep: 1,
  })

  expect(Array.from(velocity)).toEqual([0, 2])
})

it('should apply gentle vanilla guidance for browser negative prompts', () => {
  const velocity = createNegativePromptGuidedVelocity({
    latent: new Float32Array([10, 10]),
    negativeVelocity: new Float32Array([0, 0]),
    positiveVelocity: new Float32Array([1, 1]),
    timestep: 1,
  })

  expect(Array.from(velocity)).toEqual([1.5, 1.5])
})
