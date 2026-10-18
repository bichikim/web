import {expect, it} from 'vitest'
import {lossPoints} from '../loss-points'

it('should produce finite chart coordinates for empty and constant loss data', () => {
  expect(lossPoints([])).toBe('')
  expect(lossPoints([1, 1])).not.toMatch(/NaN|Infinity/)
})
it('should support the allowed 150000-step training run without argument stack overflow', () => {
  const losses = Array.from({length: 150000}, (_, index) => index % 2)
  const points = lossPoints(losses)
  expect(points.startsWith('4,92 ')).toBe(true)
  expect(points.endsWith('316,4')).toBe(true)
})
