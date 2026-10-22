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
