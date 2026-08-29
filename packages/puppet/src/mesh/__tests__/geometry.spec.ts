import {describe, expect, it} from 'vitest'

import {getMeshEdgeRecords} from '../index'

describe('getMeshEdgeRecords', () => {
  it('should preserve edge order and source triangle metadata', () => {
    expect(getMeshEdgeRecords({indices: [0, 1, 2, 2, 1, 3]})).toEqual([
      {edge: {firstIndex: 0, secondIndex: 1}, triangle: [0, 1, 2], triangleIndex: 0},
      {edge: {firstIndex: 1, secondIndex: 2}, triangle: [0, 1, 2], triangleIndex: 0},
      {edge: {firstIndex: 2, secondIndex: 0}, triangle: [0, 1, 2], triangleIndex: 0},
      {edge: {firstIndex: 2, secondIndex: 1}, triangle: [2, 1, 3], triangleIndex: 1},
      {edge: {firstIndex: 1, secondIndex: 3}, triangle: [2, 1, 3], triangleIndex: 1},
      {edge: {firstIndex: 3, secondIndex: 2}, triangle: [2, 1, 3], triangleIndex: 1},
    ])
  })
})
