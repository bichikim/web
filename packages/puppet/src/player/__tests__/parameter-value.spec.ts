import {describe, expect, test} from 'vitest'
import type {PuppetParameter} from '../document'
import {boundParameterSample, getRepeatRanges} from '../parameter-value'

const angle: PuppetParameter = {
  defaultValue: 0,
  id: 'angle',
  maximum: 360,
  minimum: 0,
  name: 'Angle',
  repeat: true,
}

describe('getRepeatRanges', () => {
  test('should reuse immutable repeat metadata while retaining binding order and missing IDs', () => {
    const parameters = [angle, {...angle, id: 'linear', repeat: false}]
    const ids = ['linear', 'angle', 'missing', 'angle']
    const ranges = getRepeatRanges(ids, parameters)
    expect(ranges).toEqual([undefined, [0, 360], undefined, [0, 360]])
    expect(getRepeatRanges(ids, parameters)).toBe(ranges)
    expect(getRepeatRanges([...ids], parameters)).toEqual(ranges)
  })

  test('should read replacement definitions without changing a previous range snapshot', () => {
    const ids = ['angle']
    const parameters = [angle]
    const before = getRepeatRanges(ids, parameters)
    expect(getRepeatRanges(ids, [{...angle, maximum: 180, minimum: -180}])).toEqual([[-180, 180]])
    expect(getRepeatRanges(ids, [{...angle, repeat: false}])).toEqual([undefined])
    expect(getRepeatRanges(ids, parameters)).toBe(before)
    expect(before).toEqual([[0, 360]])
  })

  test('should retain the first matching definition when parameter IDs are duplicated', () => {
    const ids = ['angle']
    expect(getRepeatRanges(ids, [angle, {...angle, maximum: 90}])).toEqual([[0, 360]])
    expect(getRepeatRanges(ids, [{...angle, repeat: false}, angle])).toEqual([undefined])
  })

  test('should preserve missing-definition and empty-binding results', () => {
    expect(getRepeatRanges(['angle', 'missing'], undefined)).toEqual([undefined, undefined])
    expect(getRepeatRanges([], [angle])).toEqual([])
  })
})

describe('boundParameterSample', () => {
  test.each([
    {expected: 1, value: -2},
    {expected: 0.75, value: -0.25},
    {expected: 0, value: 0},
    {expected: 1, value: 1},
    {expected: 0.25, value: 1.25},
    {expected: 0, value: 2},
  ])('should preserve inclusive repeat endpoints for sample $value', ({value, expected}) => {
    const parameter = {
      defaultValue: 0,
      id: 'repeat',
      maximum: 1,
      minimum: 0,
      name: 'Repeat',
      repeat: true,
    }
    expect(boundParameterSample(parameter, value)).toBe(expected)
  })
})

test.each([
  {expected: 0, value: -2},
  {expected: 0.25, value: 0.25},
  {expected: 1, value: 2},
])('should clamp a nonrepeating motion sample $value', ({value, expected}) => {
  expect(
    boundParameterSample({defaultValue: 0, id: 'p', maximum: 1, minimum: 0, name: 'P'}, value),
  ).toBe(expected)
})
