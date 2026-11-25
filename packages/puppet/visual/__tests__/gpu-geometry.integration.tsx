import {afterEach, expect, test} from 'vitest'
import initialize, {GeometryKernel} from '../../src/player/rendering/wgpu/wasm/runtime'

const kernels: GeometryKernel[] = []
afterEach(() => kernels.splice(0).forEach((kernel) => kernel.free()))
const adapter = await navigator.gpu?.requestAdapter()
const gpuTest = test.skipIf(adapter === null || adapter === undefined)
const pack = (values: readonly number[]) =>
  new Float32Array(
    values.flatMap((value) => {
      const high = Math.fround(value)
      const low = Math.fround(value - high)
      return [high, low, Math.abs(value - (high + low)) * 2, 0]
    }),
  )
gpuTest('should preserve bilinear and triangle coordinates near rounding boundaries', async () => {
  await initialize()
  const kernel = await GeometryKernel.create()
  kernels.push(kernel)
  const points = new Float32Array([0.125, 0.75, 0.5, 0.5, 0.875, 0.25, 0, 0, 1, 1])
  const corners = [
    1731.132407987, 287.937516894, 2398.186502677, 394.778291834, 1663.142384987, 1247.541472345,
    2583.272668192, 1388.313824756,
  ]
  for (const kind of [2, 3, 4]) {
    // eslint-disable-next-line no-await-in-loop -- The native device owns one mutable feedback buffer.
    const actual = await kernel.evaluate(
      points,
      new Uint32Array([0, points.length / 2, 0, kind]),
      pack([0, 0, 1, 1, ...corners]),
    )
    const expected = Float32Array.from(points, (_value, index) => {
      const x = points[index - (index % 2)]!
      const y = points[index - (index % 2) + 1]!
      const axis = index % 2
      const [a, b, c, d] = [
        corners[axis]!,
        corners[axis + 2]!,
        corners[axis + 4]!,
        corners[axis + 6]!,
      ]
      const value =
        kind === 2
          ? a * (1 - x) * (1 - y) + b * x * (1 - y) + c * (1 - x) * y + d * x * y
          : kind === 3
            ? x + y <= 1
              ? a + (b - a) * x + (c - a) * y
              : d + (c - d) * (1 - x) + (b - d) * (1 - y)
            : x >= y
              ? a + (b - a) * x + (d - b) * y
              : a + (d - c) * x + (c - a) * y
      return points[index]! + (value - points[index]!)
    })
    const corrections = kernel.corrections()
    for (const vertex of corrections) {
      actual.set(expected.subarray(vertex * 2, vertex * 2 + 2), vertex * 2)
    }
    expect(actual).toEqual(expected)
  }
})
gpuTest('should reject overlapping jobs instead of racing writes', async () => {
  await initialize()
  const kernel = await GeometryKernel.create()
  kernels.push(kernel)
  await expect(
    kernel.evaluate(
      new Float32Array([0, 0]),
      new Uint32Array([0, 1, 0, 2, 0, 1, 0, 2]),
      pack([0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1]),
    ),
  ).rejects.toBeDefined()
})
gpuTest('should report ambiguous affine rounding and correction-list overflow', async () => {
  await initialize()
  const kernel = await GeometryKernel.create()
  kernels.push(kernel)
  const values = pack([1, 0, 1 + 2 ** -24, 0, 1, 2, 1e-12, 1e-12])
  const points = new Float32Array(2050)
  const output = await kernel.evaluate(points, new Uint32Array([0, 1025, 0, 5]), values)
  expect(kernel.overflow()).toBe(true)
  expect(kernel.corrections()).toHaveLength(1024)
  expect(new Set(kernel.corrections()).size).toBe(1024)
  expect(output[0]).toBe(Math.fround(1 + 2 ** -24))
  expect(output[1]).toBe(2)
})
