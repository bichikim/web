import {expect, test} from 'vitest'
import {createCubismBinding} from '../create-cubism-binding'

test('should reject incomplete imported grids before producing a Poffo binding', () => {
  expect(() =>
    createCubismBinding({
      id: 'incomplete',
      interpolation: 'grid',
      keyforms: [
        [0, 0],
        [0, 1],
        [1, 0],
      ].map((values) => ({parts: [], values})),
      parameterIds: ['x', 'y'],
    }),
  ).toThrow(/grid|incomplete/i)
})
