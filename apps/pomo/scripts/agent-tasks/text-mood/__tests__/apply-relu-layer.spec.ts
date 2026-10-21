/** @vitest-environment node */
import {expect, it} from 'vitest'
import {applyReluLayer} from '../apply-relu-layer.mjs'

it('should apply row-major weights, bias and ReLU into a Float64 vector', () => {
  const result = applyReluLayer([2, -1], {
    bias: [1, 2, 1],
    inputSize: 2,
    outputSize: 3,
    weights: [1, 2, -3, 4, 0.5, -2],
  })

  expect(result).toEqual(new Float64Array([1, 0, 4]))
})

it('should add bias before the ordered feature products', () => {
  const result = applyReluLayer([1, 1], {
    bias: [1e16],
    inputSize: 2,
    outputSize: 1,
    weights: [-1e16, 1],
  })

  expect(result[0]).toBe(1)
})

it('should apply ReLU after the complete sum', () => {
  const result = applyReluLayer([1, 1], {
    bias: [-5],
    inputSize: 2,
    outputSize: 1,
    weights: [3, 3],
  })

  expect(result[0]).toBe(1)
})

it('should use the fixed input dimension without reading input length', () => {
  const input = {
    0: 2,
    1: -1,
    get length(): number {
      throw new Error('input length must remain unread')
    },
  }

  expect(applyReluLayer(input, {bias: [1], inputSize: 2, outputSize: 1, weights: [1, 2]})).toEqual(
    new Float64Array([1]),
  )
})

it('should use the fixed output size rather than the bias length', () => {
  const result = applyReluLayer([2], {
    bias: [1, 90, 100],
    inputSize: 1,
    outputSize: 1,
    weights: [3, 80, 90],
  })

  expect(result).toEqual(new Float64Array([7]))
})

it('should apply only bias when the fixed input dimension is zero', () => {
  const result = applyReluLayer([], {
    bias: [-2, 0, 3],
    inputSize: 0,
    outputSize: 3,
    weights: [],
  })

  expect(result).toEqual(new Float64Array([0, 0, 3]))
})

it('should return an empty Float64 vector for zero output nodes', () => {
  const result = applyReluLayer([2], {
    bias: [],
    inputSize: 1,
    outputSize: 0,
    weights: [],
  })

  expect(result).toEqual(new Float64Array())
})

it('should retain native NaN and infinity arithmetic and clamp negative values to positive zero', () => {
  const result = applyReluLayer([1], {
    bias: [0, 0, 0, -0],
    inputSize: 1,
    outputSize: 4,
    weights: [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -0],
  })

  expect(result).toEqual(new Float64Array([Number.NaN, Number.POSITIVE_INFINITY, 0, 0]))
  expect(result[3]).toBe(0)
})

it('should read bias, weights and input in output-major feature order', () => {
  const reads: string[] = []
  const track = (values: number[], label: string) =>
    new Proxy(values, {
      get(target, key, receiver) {
        if (key === 'length') {
          throw new Error('tensor lengths must remain unread')
        }
        reads.push(`${label}.${String(key)}`)
        return Reflect.get(target, key, receiver)
      },
    })

  const result = applyReluLayer(track([2, -1], 'input'), {
    bias: track([1, 2], 'bias'),
    inputSize: 2,
    outputSize: 2,
    weights: track([1, 2, -3, 4], 'weights'),
  })

  expect(result).toEqual(new Float64Array([1, 0]))
  expect(reads).toEqual([
    'bias.0',
    'weights.0',
    'input.0',
    'weights.1',
    'input.1',
    'bias.1',
    'weights.2',
    'input.0',
    'weights.3',
    'input.1',
  ])
})

it('should observe later optimizer updates without changing earlier results', () => {
  const weights = new Float64Array([2])
  const bias = new Float64Array([1])
  const layer = {bias, inputSize: 1, outputSize: 1, weights}
  const first = applyReluLayer([3], layer)
  weights[0] = 4
  bias[0] = 2
  const second = applyReluLayer([3], layer)

  expect(first).toEqual(new Float64Array([7]))
  expect(second).toEqual(new Float64Array([14]))
  expect(second).not.toBe(first)
})

it('should leave caller-owned input and parameter buffers unchanged', () => {
  const input = new Float64Array([2])
  const weights = new Float64Array([3])
  const bias = new Float64Array([1])
  applyReluLayer(input, {bias, inputSize: 1, outputSize: 1, weights})

  expect(input).toEqual(new Float64Array([2]))
  expect(weights).toEqual(new Float64Array([3]))
  expect(bias).toEqual(new Float64Array([1]))
})

it('should propagate an indexed input failure with its original identity', () => {
  const failure = new Error('input unavailable')
  const input = {
    get 0(): number {
      throw failure
    },
    length: 1,
  }
  let caught: unknown
  try {
    applyReluLayer(input, {bias: [0], inputSize: 1, outputSize: 1, weights: [1]})
  } catch (error: unknown) {
    caught = error
  }

  expect(caught).toBe(failure)
})

it('should preserve native Float64 allocation failure for a negative output size', () => {
  expect(() => applyReluLayer([], {bias: [], inputSize: 0, outputSize: -1, weights: []})).toThrow(
    RangeError,
  )
})
