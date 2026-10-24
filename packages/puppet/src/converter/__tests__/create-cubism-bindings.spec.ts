import {expect, test} from 'vitest'
import {createCubismBindings} from '../create-cubism-bindings'

const binding = {
  id: 'five-axis',
  interpolation: 'grid' as const,
  keyforms: Array.from({length: 32}, (_, index) => ({
    parts: [],
    values: Array.from({length: 5}, (_, axis) => Math.floor(index / 2 ** axis) % 2),
  })),
  parameterIds: ['x', 'y', 'z', 'jaw', 'tongue'],
}

test('should retain the five-axis grid as four weighted three-axis slices', () => {
  const slices = createCubismBindings(binding)
  expect(slices).toHaveLength(4)
  expect(
    slices.every((slice) => slice.keyforms.length === 8 && slice.parameterIds.length === 3),
  ).toBe(true)
  expect(slices[0]?.influenceMode).toBe('multiply')
  expect(slices[0]?.influences?.map((influence) => influence.parameterId)).toEqual([
    'jaw',
    'tongue',
  ])
})

test('should reject a missing whole slice instead of accepting an incomplete full grid', () => {
  const incomplete = {
    ...binding,
    keyforms: binding.keyforms.filter((form) => form.values[3] !== 1 || form.values[4] !== 1),
  }
  expect(() => createCubismBindings(incomplete)).toThrow('grid is incomplete')
})
