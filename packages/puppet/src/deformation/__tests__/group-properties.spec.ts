import {expect, test} from 'vitest'
import {composeColorEffects} from '../group-properties'

test('should preserve Cubism multiply and screen inheritance independently', () => {
  const inner = {
    multiplyColor: [0.3, 0.3, 0.3] as const,
    opacity: 0.5,
    screenColor: [0.2, 0.2, 0.2] as const,
  }
  const outer = {
    multiplyColor: [0.5, 0.5, 0.5] as const,
    opacity: 0.5,
    screenColor: [0.4, 0.4, 0.4] as const,
  }
  const cubism = composeColorEffects(inner, outer, 'cubism')
  expect(cubism.multiplyColor).toEqual([0.15, 0.15, 0.15])
  expect(cubism.screenColor).toEqual([0.52, 0.52, 0.52])
  expect(cubism.opacity).toBe(0.25)
  expect(composeColorEffects(inner, outer).screenColor).toEqual([0.46, 0.46, 0.46])
})
