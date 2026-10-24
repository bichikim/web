import {describe, expect, test} from 'vitest'

import type {PuppetDeformerShape} from '../../player/document'
import {getVertexInfluence} from '../weights'

describe('getVertexInfluence', () => {
  test('should use the first authored weight for each part and vertex', () => {
    const shape: PuppetDeformerShape = {
      bounds: {height: 1, width: 1, x: 0, y: 0},
      columns: 1,
      controlPoints: [0, 0, 1, 0, 0, 1, 1, 1],
      rows: 1,
      vertexInfluences: [
        {partId: 'face', vertexIndex: 2, weight: 0.25},
        {partId: 'hair', vertexIndex: 2, weight: 0.5},
        {partId: 'face', vertexIndex: 2, weight: 0.75},
      ],
    }

    expect(getVertexInfluence(shape, {partId: 'face', vertexIndex: 2})).toBe(0.25)
    expect(getVertexInfluence(shape, {partId: 'hair', vertexIndex: 2})).toBe(0.5)
    expect(getVertexInfluence(shape, {partId: 'face', vertexIndex: 3})).toBe(1)
    expect(getVertexInfluence(shape)).toBe(1)
  })

  test('should use the same authored weights when a sampled shape shares the list', () => {
    const vertexInfluences = [{partId: 'face', vertexIndex: 0, weight: 0}]
    const first: PuppetDeformerShape = {
      bounds: {height: 1, width: 1, x: 0, y: 0},
      columns: 1,
      controlPoints: [0, 0, 1, 0, 0, 1, 1, 1],
      rows: 1,
      vertexInfluences,
    }
    const sampled = {...first}

    expect(getVertexInfluence(first, {partId: 'face', vertexIndex: 0})).toBe(0)
    expect(getVertexInfluence(sampled, {partId: 'face', vertexIndex: 0})).toBe(0)
  })
})
