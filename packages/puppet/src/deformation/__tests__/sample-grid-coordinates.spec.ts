import {expect, test} from 'vitest'
import type {PuppetParameterBinding1D} from '../../player'
import {sampleGridCoordinates} from '../sample-grid-coordinates'

const binding: PuppetParameterBinding1D = {
  id: 'grid',
  interpolation: 'grid',
  keyforms: [
    {parts: [], values: [0]},
    {parts: [], values: [1]},
  ],
  parameterIds: ['p'],
}
const options = {binding, keyformCoordinates: [[0], [1]], restCoordinates: [0]}

test('should retain per-coordinate rest fallbacks and corner accumulation order', () => {
  const query = {
    ...options,
    keyformCoordinates: [[1e16, 20], [1e16 + 4]],
    restCoordinates: [0, 12, 7],
    values: [0.5],
  }
  expect(sampleGridCoordinates(query)).toEqual([1e16 + 2, 16, 7])
  expect(sampleGridCoordinates({...query, keyformCoordinates: [undefined, [8, 16, 9]]})).toEqual([
    4, 14, 8,
  ])
})

test('should reuse interpolation independently of channel coordinates and observe new point values', () => {
  const values = [0.25]
  expect(sampleGridCoordinates({...options, values})).toEqual([0.25])
  const channel = {...options, keyformCoordinates: [[10], [30]], restCoordinates: [99], values}
  expect(sampleGridCoordinates(channel)).toEqual([15])
  values[0] = 0.75
  expect(sampleGridCoordinates(channel)).toEqual([25])
  expect(sampleGridCoordinates({...channel, sampling: 'step'})).toEqual([10])
  expect(sampleGridCoordinates(channel)).toEqual([25])
})

test('should resample a repeated point when the wrap range changes', () => {
  const repeatRanges: [number, number][] = [[0, 2]]
  const query = {...options, keyformCoordinates: [[0], [10]], repeatRanges, values: [1.5]}
  expect(sampleGridCoordinates(query)).toEqual([5])
  repeatRanges[0] = [0, 3]
  expect(sampleGridCoordinates(query)).toEqual([7.5])
})

test('should preserve legacy continuous snapping and discrete Float32 defaults', () => {
  expect(sampleGridCoordinates({...options, values: [0.99999]})).toEqual([1])
  expect(sampleGridCoordinates({...options, sampling: 'step', values: [1 - 1e-8]})).toEqual([1])
})

test('should interpolate close to a key when snapping is disabled', () => {
  const precise = {...binding, sampling: {keyTolerance: 0}}
  expect(sampleGridCoordinates({...options, binding: precise, values: [0.99999]})).toEqual([
    0.99999,
  ])
})

test('should snap native parameter distances independently of the spacing between keys', () => {
  const native: PuppetParameterBinding1D = {
    ...binding,
    keyforms: [
      {parts: [], values: [0]},
      {parts: [], values: [30]},
    ],
    sampling: {continuousPrecision: 'float32', keyTolerance: 0.001, keyToleranceUnit: 'parameter'},
  }
  expect(sampleGridCoordinates({...options, binding: native, values: [0.0005]})).toEqual([0])
  expect(sampleGridCoordinates({...options, binding: native, values: [0.0015]})[0]).toBeCloseTo(
    Math.fround(0.0015) / 30,
    12,
  )
})

test('should select continuous precision without changing interpolation', () => {
  const precise = {...binding, sampling: {continuousPrecision: 'float32' as const, keyTolerance: 0}}
  expect(sampleGridCoordinates({...options, binding: precise, values: [0.7]})).toEqual([
    Math.fround(0.7),
  ])
  expect(sampleGridCoordinates({...options, values: [0.7]})).toEqual([0.7])
})

test('should select discrete precision independently of continuous precision and tolerance', () => {
  const precise = {
    ...binding,
    sampling: {
      continuousPrecision: 'float32' as const,
      discretePrecision: 'float64' as const,
      keyTolerance: 0,
    },
  }
  expect(
    sampleGridCoordinates({...options, binding: precise, sampling: 'step', values: [1 - 1e-8]}),
  ).toEqual([0])
  expect(
    sampleGridCoordinates({...options, binding: precise, sampling: 'step', values: [1]}),
  ).toEqual([1])
})

test('should evaluate the default coordinates of a five-axis import grid before slicing', () => {
  const keyforms = Array.from({length: 32}, (_, index) => ({
    values: Array.from({length: 5}, (_, axis) => Math.floor(index / 2 ** axis) % 2),
  }))
  expect(
    sampleGridCoordinates({
      binding: {keyforms, parameterIds: ['a', 'b', 'c', 'd', 'e']},
      keyformCoordinates: keyforms.map((_, index) => [index === 31 ? 32 : 0]),
      restCoordinates: [0],
      values: [0.5, 0.5, 0.5, 0.5, 0.5],
    }),
  ).toEqual([1])
})

test('should keep the first duplicate corner and refresh a replaced keyform grid', () => {
  const duplicate = {...binding, keyforms: [...binding.keyforms, binding.keyforms[0]!]}
  expect(
    sampleGridCoordinates({
      ...options,
      binding: duplicate,
      keyformCoordinates: [[3], [8], [99]],
      values: [0],
    }),
  ).toEqual([3])
  const changed = {
    ...duplicate,
    keyforms: duplicate.keyforms.map((form) => ({
      ...form,
      values: [form.values[0]! + 10] as const,
    })),
  }
  expect(
    sampleGridCoordinates({
      ...options,
      binding: changed,
      keyformCoordinates: [[4], [8], [99]],
      values: [10],
    }),
  ).toEqual([4])
  expect(
    sampleGridCoordinates({
      ...options,
      binding: duplicate,
      keyformCoordinates: [[5], [8], [99]],
      values: [0],
    }),
  ).toEqual([5])
})
