import {describe, expect, it} from 'vitest'

import {generateMesh, type PixelData} from '../generate-mesh'

const COLOR_CHANNEL_COUNT = 4
const ALPHA_OFFSET = 3
const OPAQUE_ALPHA = 255

const createPixels = (
  width: number,
  height: number,
  opaquePixels: ReadonlyArray<readonly [number, number]>,
): PixelData => {
  const data = new Uint8ClampedArray(width * height * COLOR_CHANNEL_COUNT)

  for (const [x, y] of opaquePixels) {
    data[(y * width + x) * COLOR_CHANNEL_COUNT + ALPHA_OFFSET] = OPAQUE_ALPHA
  }

  return {data, height, width}
}

describe('generateMesh', () => {
  it('should generate two triangles and normalized UVs for an opaque cell', () => {
    const result = generateMesh({
      cellSize: 4,
      pixels: createPixels(4, 4, [[1, 1]]),
    })

    expect(result).toEqual({
      mesh: {
        boundaryLoops: [[0, 1, 2, 3]],
        indices: [0, 1, 2, 0, 2, 3],
        uvs: [0.25, 0.25, 0.5, 0.25, 0.5, 0.5, 0.25, 0.5],
        vertices: [1, 1, 2, 1, 2, 2, 1, 2],
      },
      ok: true,
    })
  })

  it('should preserve disconnected alpha regions as separate triangle cells', () => {
    const result = generateMesh({
      cellSize: 1,
      pixels: createPixels(3, 1, [
        [0, 0],
        [2, 0],
      ]),
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.mesh.boundaryLoops).toHaveLength(2)
      expect(result.mesh.indices).toHaveLength(12)
      expect(result.mesh.vertices).toHaveLength(16)
    }
  })

  it('should fill an enclosed transparent region without changing the texture pixels', () => {
    const opaquePixels = Array.from({length: 3}, (_, y) =>
      Array.from({length: 3}, (_, x) => [x, y] as const),
    )
      .flat()
      .filter(([x, y]) => x !== 1 || y !== 1)
    const pixels = createPixels(3, 3, opaquePixels)
    const result = generateMesh({cellSize: 1, pixels})

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.mesh.boundaryLoops).toHaveLength(1)
      expect(result.mesh.indices).toHaveLength(54)
      expect(result.mesh.vertices).toHaveLength(32)
      expect(pixels.data[(1 * 3 + 1) * COLOR_CHANNEL_COUNT + ALPHA_OFFSET]).toBe(0)
    }
  })

  it('should keep transparent cells connected to the image exterior outside the mesh', () => {
    const opaquePixels = Array.from({length: 3}, (_, y) =>
      Array.from({length: 3}, (_, x) => [x, y] as const),
    )
      .flat()
      .filter(([x, y]) => !(x === 1 && (y === 0 || y === 1)))
    const result = generateMesh({cellSize: 1, pixels: createPixels(3, 3, opaquePixels)})

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.mesh.boundaryLoops).toHaveLength(1)
      expect(result.mesh.indices).toHaveLength(42)
    }
  })

  it('should reuse vertices shared by adjacent opaque cells', () => {
    const result = generateMesh({
      cellSize: 1,
      pixels: createPixels(2, 1, [
        [0, 0],
        [1, 0],
      ]),
    })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.mesh.boundaryLoops).toEqual([[0, 1, 4, 5, 2, 3]])
      expect(result.mesh.indices).toHaveLength(12)
      expect(result.mesh.vertices).toHaveLength(12)
    }
  })

  it('should reject a fully transparent image', () => {
    expect(generateMesh({pixels: createPixels(2, 2, [])})).toEqual({
      error: {code: 'no-opaque-pixels'},
      ok: false,
    })
    expect(generateMesh({alphaThreshold: 0, pixels: createPixels(1, 1, [])})).toEqual({
      error: {code: 'no-opaque-pixels'},
      ok: false,
    })
  })

  it('should reject invalid pixel, threshold, and cell-size inputs', () => {
    expect(generateMesh({pixels: {data: new Uint8ClampedArray(), height: 1, width: 1}})).toEqual({
      error: {code: 'invalid-pixel-data'},
      ok: false,
    })
    expect(generateMesh({alphaThreshold: 256, pixels: createPixels(1, 1, [[0, 0]])})).toEqual({
      error: {code: 'invalid-alpha-threshold'},
      ok: false,
    })
    expect(generateMesh({cellSize: 0, pixels: createPixels(1, 1, [[0, 0]])})).toEqual({
      error: {code: 'invalid-cell-size'},
      ok: false,
    })
  })
})
