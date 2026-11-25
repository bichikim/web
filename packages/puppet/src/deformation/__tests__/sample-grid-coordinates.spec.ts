import {expect, test} from 'vitest'
import type {PuppetParameterBinding1D} from '../../player'
import {
  createGridCoordinateSampler,
  getGridCorners,
  prepareGridBindings,
  sampleGridCoordinates,
} from '../sample-grid-coordinates'

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

class RoundedSampling {
  get continuousPrecision() {
    return 'float32' as const
  }
}

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

test('should share compatible interpolation without retaining another channel or changing a snapshot', () => {
  const first = {...binding, id: 'first'}
  const second = {...binding, id: 'second', keyforms: [...binding.keyforms]}
  prepareGridBindings([first, second])
  const values = [0.25]
  const query = {
    ...options,
    binding: first,
    keyformCoordinates: [[10], [30]],
    values,
  }
  const corners = getGridCorners(query)
  expect(getGridCorners({...query, binding: second})).toBe(corners)
  const snapshot = createGridCoordinateSampler(query)
  expect(snapshot(0)).toBe(15)
  expect(
    sampleGridCoordinates({
      ...query,
      binding: second,
      keyformCoordinates: [undefined, [8]],
      restCoordinates: [4],
    }),
  ).toEqual([5])
  values[0] = 0.75
  expect(sampleGridCoordinates({...query, binding: second})).toEqual([25])
  expect(sampleGridCoordinates({...query, sampling: 'step'})).toEqual([10])
  expect(snapshot(0)).toBe(15)
})

test('should retain keyform order, precision and changing repeat ranges after sharing preparation', () => {
  const first = {...binding, id: 'first'}
  const reversed = {...binding, id: 'reversed', keyforms: binding.keyforms.toReversed()}
  const rounded = {
    ...binding,
    id: 'rounded',
    sampling: {continuousPrecision: 'float32' as const, keyTolerance: 0},
  }
  prepareGridBindings([first, reversed, rounded])
  const query = {...options, keyformCoordinates: [[10], [30]], values: [0.25]}
  expect(sampleGridCoordinates({...query, binding: first})).toEqual([15])
  expect(sampleGridCoordinates({...query, binding: reversed})).toEqual([25])
  expect(sampleGridCoordinates({...options, binding: rounded, values: [0.7]})).toEqual([
    Math.fround(0.7),
  ])
  expect(sampleGridCoordinates({...options, binding: first, values: [0.7]})).toEqual([0.7])
  const repeated = {...options, binding: first, keyformCoordinates: [[0], [10]], values: [1.5]}
  expect(sampleGridCoordinates({...repeated, repeatRanges: [[0, 2]]})).toEqual([5])
  expect(sampleGridCoordinates({...repeated, repeatRanges: [[0, 3]]})).toEqual([7.5])
})

test('should preserve signed zero and nonfinite keys when preparing independent grids', () => {
  const bindings = [-0, 0, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].map(
    (key, index): PuppetParameterBinding1D => ({
      ...binding,
      id: `grid-${index}`,
      keyforms: [{parts: [], values: [key]}, binding.keyforms[1]!],
    }),
  )
  const queries = bindings.map((binding) => ({...options, binding, values: [0.25]}))
  const expected = queries.map(sampleGridCoordinates)
  prepareGridBindings(bindings)
  expect(queries.map(sampleGridCoordinates)).toEqual(expected)
})

test.each([
  ['inherited', new RoundedSampling()],
  [
    'non-enumerable',
    Object.defineProperty({continuousPrecision: 'float32' as const}, 'continuousPrecision', {
      enumerable: false,
    }),
  ],
] as const)('should retain %s sampling policies when sharing grids', (_kind, sampling) => {
  const precise = {...binding, id: 'precise'}
  const rounded = {...binding, id: 'rounded', sampling}
  prepareGridBindings([precise, rounded])
  expect(sampleGridCoordinates({...options, binding: precise, values: [0.7]})).toEqual([0.7])
  expect(sampleGridCoordinates({...options, binding: rounded, values: [0.7]})).toEqual([
    Math.fround(0.7),
  ])
})

test('should ignore unrelated sampling metadata while preparing a grid', () => {
  const metadata: Record<string, unknown> = {}
  metadata.self = metadata
  const sampling = {continuousPrecision: 'float64' as const, metadata}
  const subject = {...binding, sampling}
  prepareGridBindings([subject])
  expect(sampleGridCoordinates({...options, binding: subject, values: [0.7]})).toEqual([0.7])
})

test('should index numeric keyforms independently of an array serialization hook', () => {
  const values = Object.assign([2] as const, {toJSON: () => [1]})
  const subject = {...binding, keyforms: [binding.keyforms[0]!, {parts: [], values}]}
  expect(sampleGridCoordinates({...options, binding: subject, values: [1]})).toEqual([0.5])
})

test('should keep distinct numeric grids independent when their serialization hooks match', () => {
  const values = Object.assign([2] as const, {toJSON: () => [1]})
  const first = {...binding}
  const second = {...binding, keyforms: [binding.keyforms[0]!, {parts: [], values}]}
  prepareGridBindings([first, second])
  expect(sampleGridCoordinates({...options, binding: first, values: [1]})).toEqual([1])
  expect(sampleGridCoordinates({...options, binding: second, values: [1]})).toEqual([0.5])
})

test.each([
  ['discretePrecision', {discretePrecision: 'float64', keyTolerance: 0}, [0, 1], 1 - 1e-8, 'step'],
  ['keyTolerance', {keyTolerance: 0}, [0, 1], 0.99999, undefined],
  [
    'keyToleranceUnit',
    {keyTolerance: 0.1, keyToleranceUnit: 'parameter'},
    [0, 0.01],
    0.005,
    undefined,
  ],
] as const)(
  'should keep %s independent when the policy field is non-enumerable',
  (field, policy, keys, value, sampling) => {
    const rest = Object.fromEntries(Object.entries(policy).filter(([key]) => key !== field))
    const first = {
      ...binding,
      keyforms: keys.map((key) => ({parts: [], values: [key] as const})),
      sampling: rest,
    }
    const second = {
      ...first,
      sampling: Object.defineProperty({...policy}, field, {enumerable: false}),
    }
    const query = {...options, sampling, values: [value]}
    const expected = sampleGridCoordinates({...query, binding: second})
    expect(sampleGridCoordinates({...query, binding: first})).not.toEqual(expected)
    prepareGridBindings([first, second])
    sampleGridCoordinates({...query, binding: first})
    expect(sampleGridCoordinates({...query, binding: second})).toEqual(expected)
  },
)
