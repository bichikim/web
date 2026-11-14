import {describe, expect, test} from 'vitest'
import {GRADIENT_VERTEX_WORDS, packGradientVertices} from '../pack-gradient-vertices'

const vertices = (values: ReadonlyArray<ReadonlyArray<number>>) => {
  const data = new Float32Array(values.flatMap((value) => [...value, 0, 0]))
  const words = new Uint32Array(data.buffer)
  for (let index = 0; index < values.length; index += 1) {
    words[index * 6 + 4] = 0xa5ffffff
    words[index * 6 + 5] = 0x10000
  }
  return data
}

describe('packGradientVertices', () => {
  test.each(['first', 'last'] as const)(
    'should retain packed attributes with the %s provoking vertex',
    (provoking) => {
      const source = vertices([
        [0, 0, 0.25, 0.5],
        [2, 0, 0.75, 0.5],
        [0, 4, 0.25, 1],
      ])
      const target = new Float32Array(4 * 6)
      const sourceWords = new Uint32Array(source.buffer)
      sourceWords[4] = 0xffffffff
      const gradients = new Float32Array(4 * GRADIENT_VERTEX_WORDS)
      const targetIndices = new Uint32Array(3)
      packGradientVertices({
        gradients,
        indices: new Uint32Array([0, 1, 2]),
        provoking,
        source,
        target,
        targetIndices,
      })
      expect(targetIndices).toEqual(
        provoking === 'first' ? Uint32Array.of(3, 1, 2) : Uint32Array.of(0, 1, 3),
      )
      expect(gradients.subarray(12, 16)).toEqual(Float32Array.of(0.25, 0, 0, 0.125))
      const words = new Uint32Array(target.buffer)
      for (let corner = 0; corner < 3; corner += 1) {
        expect(words[corner * 6 + 4]).toBe(sourceWords[corner * 6 + 4])
        expect(words[corner * 6 + 5]).toBe(0x10000)
        expect([...target.subarray(corner * 6, corner * 6 + 4)]).toEqual([
          ...source.subarray(corner * 6, corner * 6 + 4),
        ])
      }
    },
  )

  test('should preserve shear and reversed winding without averaging shared corners', () => {
    const source = vertices([
      [0, 0, 0, 0],
      [2, 0, 1, 0.5],
      [1, 2, 0.25, 1],
      [0, 2, 1, 1],
    ])
    const target = new Float32Array(6 * 6)
    const gradients = new Float32Array(6 * GRADIENT_VERTEX_WORDS)
    packGradientVertices({
      gradients,
      indices: new Uint16Array([2, 1, 0, 0, 1, 3]),
      source,
      target,
      targetIndices: new Uint32Array(6),
    })
    expect(gradients.subarray(16, 20)).toEqual(Float32Array.of(0.5, 0.25, -0.125, 0.375))
    expect(gradients.subarray(20, 24)).toEqual(Float32Array.of(0.5, 0.25, 0.5, 0.5))
  })

  test('should emit finite zero gradients for degenerate triangles and retain unused capacity', () => {
    const source = vertices([
      [0, 0, 0, 0],
      [1, 0, 1, 0],
      [2, 0, 0, 1],
    ])
    const target = new Float32Array(5 * 6).fill(9)
    const gradients = new Float32Array(5 * GRADIENT_VERTEX_WORDS).fill(9)
    packGradientVertices({
      gradients,
      indices: new Uint32Array([0, 1, 2]),
      source,
      target,
      targetIndices: new Uint32Array(3),
    })
    expect(gradients.subarray(12, 16)).toEqual(Float32Array.of(0, 0, 0, 0))
    expect(target.subarray(24)).toEqual(new Float32Array(6).fill(9))
  })
})
