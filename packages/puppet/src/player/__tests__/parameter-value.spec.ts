import {describe, expect, test} from 'vitest'
import type {PuppetParameter} from '../document'
import {getRepeatRanges} from '../parameter-value'

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
