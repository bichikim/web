import {expect, test} from 'vitest'
import {createDemoDocument} from '../../player'
import {createColorEffectComposer} from '../keyed-color-effect'

const rest = {multiplyColor: [1, 1, 1] as const, opacity: 1, screenColor: [0, 0, 0] as const}

const createFixture = () => {
  const source = createDemoDocument()
  const binding = source.parameterBindings![0]!
  const document = {
    ...source,
    parameterBindings: [
      {
        ...binding,
        influences: [
          {
            parameterId: 'angle-y',
            points: [
              {value: -30, weight: 0},
              {value: 30, weight: 1},
            ],
          },
        ],
      },
    ],
  }
  const compose = createColorEffectComposer({
    document,
    keyedProperties: (entry) =>
      entry.keyforms.map((form) => ({opacity: (form.values[0]! + 30) / 60})),
    rest,
  })
  return compose
}

test('should compose prepared channels with influences and retain earlier snapshots', () => {
  const compose = createFixture()
  const before = compose({'angle-x': -30, 'angle-y': -30})
  expect(before.opacity).toBe(1)
  expect(compose({'angle-x': -30, 'angle-y': 30}).opacity).toBe(0)
  expect(before.opacity).toBe(1)
})

test('should reuse only the latest relevant inputs and observe changed values in reused records', () => {
  const compose = createFixture()
  const values = {'angle-x': 0, 'angle-y': 30, unrelated: 0}
  const before = compose(values)
  expect(before.opacity).toBe(0.5)
  expect(compose({...values, unrelated: 1})).toBe(before)
  values['angle-x'] = 30
  expect(compose(values).opacity).toBe(1)
  expect(before.opacity).toBe(0.5)
})

test('should preserve defaults, missing channels and clamping without input-dependent changes', () => {
  const document = createDemoDocument()
  const compose = createColorEffectComposer({
    document,
    keyedProperties: () => undefined,
    rest: {...rest, opacity: 2},
  })
  expect(compose()).toEqual({...rest, opacity: 1})
  expect(compose({'angle-x': 20})).toBe(compose())
})

test('should preserve the rest values when every keyed channel equals the rest', () => {
  const document = createDemoDocument()
  const compose = createColorEffectComposer({
    document,
    keyedProperties: (binding) => binding.keyforms.map(() => rest),
    rest,
  })
  expect(compose({'angle-x': -30})).toEqual(rest)
  expect(compose({'angle-x': 30})).toBe(compose({'angle-x': -30}))
})

test('should retain a result snapshot when different inputs compose the same color values', () => {
  const document = createDemoDocument()
  const compose = createColorEffectComposer({
    document,
    keyedProperties: (binding) => binding.keyforms.map(() => ({opacity: 0.4})),
    rest,
  })
  const before = compose({'angle-x': -30})
  expect(compose({'angle-x': 30})).toBe(before)
  expect(before.opacity).toBeCloseTo(0.4)
})
