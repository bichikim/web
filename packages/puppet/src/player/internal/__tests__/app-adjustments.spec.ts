import {expect, it} from 'vitest'
import {createAppAdjustments} from '../app-adjustments'
import {createDemoDocument} from '../../create-demo-document'

it('should release direct interaction without clearing tracking or semantic blends', () => {
  const document = createDemoDocument()
  const adjustments = createAppAdjustments()
  adjustments.setParameterBlend(document, 'angle-x', {mode: 'add', value: 2})
  adjustments.setParameterBlend(document, 'angle-x', {mode: 'add', value: 3}, 'after-physics')
  adjustments.setParameterBlend(document, 'angle-x', {mode: 'add', value: 4}, 'interaction')
  const tracked = adjustments.applyBlends(document, {'angle-x': 1})
  const narrated = adjustments.applyBlends(document, tracked, 'after-physics')
  expect(adjustments.applyBlends(document, narrated, 'interaction')['angle-x']).toBe(10)
  adjustments.setParameterBlend(document, 'angle-x', undefined, 'interaction')
  expect(adjustments.applyBlends(document, narrated, 'interaction')['angle-x']).toBe(6)
  expect(adjustments.applyBlends(document, {'angle-x': 1})['angle-x']).toBe(3)
})
