import {describe, expect, test} from 'vitest'

import {createDemoDocument, type PuppetParameterBinding2D} from '../../player'
import {sampleParameterVertices} from '../parameter'

describe('sampleParameterVertices', () => {
  test('should interpolate a two-dimensional point set through its Delaunay triangles', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!

    expect(
      sampleParameterVertices({
        binding: document.parameterBindings?.[0],
        partId: part.id,
        restVertices: part.mesh.vertices,
        values: [15, 15],
      }).slice(-2),
    ).toEqual([352, 272])
  })

  test('should interpolate a sparse triangular keyform set', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const binding = document.parameterBindings?.[0] as PuppetParameterBinding2D
    const sparseBinding = {
      ...binding,
      keyforms: binding.keyforms.filter((keyform) =>
        [
          [0, 0],
          [30, 0],
          [0, 30],
        ].some(([x, y]) => keyform.values[0] === x && keyform.values[1] === y),
      ),
    }

    expect(
      sampleParameterVertices({
        binding: sparseBinding,
        partId: part.id,
        restVertices: part.mesh.vertices,
        values: [15, 15],
      }).slice(-2),
    ).toEqual([352, 272])
  })

  test('should project onto a sparse line when fewer than three non-collinear keyforms remain', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!
    const binding = document.parameterBindings?.[0] as PuppetParameterBinding2D
    const lineBinding = {
      ...binding,
      keyforms: binding.keyforms.filter(
        (keyform) => keyform.values[1] === 0 && keyform.values[0] !== 0,
      ),
    }

    expect(
      sampleParameterVertices({
        binding: lineBinding,
        partId: part.id,
        restVertices: part.mesh.vertices,
        values: [0, 20],
      }).slice(-2),
    ).toEqual([320, 240])
  })

  test('should clamp outside values to the grid edge', () => {
    const document = createDemoDocument()
    const part = document.parts[0]!

    expect(
      sampleParameterVertices({
        binding: document.parameterBindings?.[0],
        partId: part.id,
        restVertices: part.mesh.vertices,
        values: [-100, 100],
      }).slice(-2),
    ).toEqual([256, 304])
  })
})
