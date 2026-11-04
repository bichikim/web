import {expect, test} from 'vitest'
import {createExpressionLayers} from '../create-expression-layers'

test('should restore independent fading channels through a cloned checkpoint', () => {
  const expressions = [
    {fadeInTime: 1, fadeOutTime: 1, id: 'smile', parameters: []},
    {fadeInTime: 1, fadeOutTime: 1, id: 'wink', parameters: []},
  ]
  const original = createExpressionLayers(expressions, () => {})
  original.set('face', 'smile')
  original.set('eyes', 'wink')
  original.advance(0.25)
  original.set('eyes')
  const restored = createExpressionLayers(expressions, () => {})
  restored.restore(structuredClone(original.capture()))
  expect(restored.layers()).toEqual(original.layers())
  original.advance(0.25)
  restored.advance(0.25)
  expect(restored.layers()).toEqual(original.layers())
  expect(restored.isAnimating()).toBe(true)
})
