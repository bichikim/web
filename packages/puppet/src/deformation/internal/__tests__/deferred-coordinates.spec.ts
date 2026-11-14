import {expect, test, vi} from 'vitest'
import {
  createDeferredCoordinates,
  createDeferredPointCoordinates,
  getCoordinateReader,
} from '../deferred-coordinates'

test('should sample each requested coordinate once and leave other coordinates deferred', () => {
  const sample = vi.fn((index: number) => index * 2)
  const coordinates = createDeferredCoordinates({length: 8, sample})
  expect(coordinates.length).toBe(8)
  expect(Array.isArray(coordinates)).toBe(true)
  expect(sample).not.toHaveBeenCalled()
  expect(coordinates[3]).toBe(6)
  expect(getCoordinateReader(coordinates)(3)).toBe(6)
  expect(coordinates[3]).toBe(6)
  expect(coordinates[-1]).toBeUndefined()
  expect(coordinates[8]).toBeUndefined()
  expect(getCoordinateReader(coordinates)(8)).toBeUndefined()
  expect(getCoordinateReader(coordinates)(-1)).toBeUndefined()
  expect(getCoordinateReader(coordinates)(Number.NaN)).toBeUndefined()
  expect(sample).toHaveBeenCalledExactlyOnceWith(3)
  expect(coordinates.slice(2, 4)).toEqual([4, 6])
  expect(sample).toHaveBeenCalledTimes(2)
})

test('should expose empty buffers and ordinary arrays without invoking a deferred sample', () => {
  const sample = vi.fn(() => 1)
  const empty = createDeferredCoordinates({length: 0, sample})
  expect(Array.from(empty)).toEqual([])
  expect(getCoordinateReader(empty)(0)).toBeUndefined()
  expect(sample).not.toHaveBeenCalled()
  expect(getCoordinateReader([2, 4])(1)).toBe(4)
})

test('should materialize ordinary array reads, enumeration and JSON without changing coordinates', () => {
  const coordinates = createDeferredCoordinates({length: 3, sample: (index) => index + 0.5})
  expect(Object.getOwnPropertyDescriptor(coordinates, '1')?.value).toBe(1.5)
  expect(Object.keys(coordinates)).toEqual(['0', '1', '2'])
  expect(Array.from(coordinates)).toEqual([0.5, 1.5, 2.5])
  expect(coordinates.map((value) => value * 2)).toEqual([1, 3, 5])
  expect(JSON.stringify(coordinates)).toBe('[0.5,1.5,2.5]')
})

test('should sample each numeric channel once and expose the same array values and descriptors', () => {
  const sample = vi.fn((index: number) => (index === 0 ? -0 : index * 0.25))
  const values = createDeferredCoordinates({length: 4, sample})
  const read = getCoordinateReader(values)
  expect(Array.isArray(values)).toBe(true)
  expect(Object.is(read(0), -0)).toBe(true)
  expect(read(2)).toBe(0.5)
  expect(values[2]).toBe(0.5)
  expect(sample).toHaveBeenCalledTimes(2)
  expect(Object.getOwnPropertyDescriptor(values, '1')).toMatchObject({value: 0.25})
  expect(Object.keys(values)).toEqual(['0', '1', '2', '3'])
  expect(Array.from(values)).toEqual([-0, 0.25, 0.5, 0.75])
  expect(sample).toHaveBeenCalledTimes(4)
  expect(read(-1)).toBeUndefined()
  expect(read(1.5)).toBeUndefined()
  expect(read(4)).toBeUndefined()
  expect(sample).toHaveBeenCalledTimes(4)
})

test('should preserve array length reflection and freezing for a deferred buffer', () => {
  const values = createDeferredCoordinates({length: 3, sample: (index) => index + 1})
  expect(Object.getOwnPropertyDescriptor(values, 'length')?.value).toBe(3)
  expect(values.slice(1)).toEqual([2, 3])
  Object.freeze(values)
  expect(Object.isFrozen(values)).toBe(true)
  expect(Array.from(values)).toEqual([1, 2, 3])
  expect(values.length).toBe(3)
})

test('should resolve both coordinates once when either axis of a point is requested', () => {
  const sample = vi.fn((index: number) => ({x: index === 0 ? -0 : index + 0.25, y: index + 0.75}))
  const coordinates = createDeferredPointCoordinates({pointCount: 3, sample})
  const read = getCoordinateReader(coordinates)
  expect(coordinates.length).toBe(6)
  expect(coordinates[3]).toBe(1.75)
  expect(read(2)).toBe(1.25)
  expect(sample).toHaveBeenCalledExactlyOnceWith(1)
  expect(read(1)).toBe(0.75)
  expect(Object.is(read(0), -0)).toBe(true)
  expect(sample).toHaveBeenCalledTimes(2)
  expect(read(-1)).toBeUndefined()
  expect(read(0.5)).toBeUndefined()
  expect(read(6)).toBeUndefined()
  expect(Object.keys(coordinates)).toEqual(['0', '1', '2', '3', '4', '5'])
  expect(Array.from(coordinates)).toEqual([-0, 0.75, 1.25, 1.75, 2.25, 2.75])
  expect(sample).toHaveBeenCalledTimes(3)
  Object.freeze(coordinates)
  expect(Array.from(coordinates)).toEqual([-0, 0.75, 1.25, 1.75, 2.25, 2.75])
})

test('should reject invalid point counts and leave empty point buffers unsampled', () => {
  const sample = vi.fn(() => ({x: 1, y: 2}))
  expect(Array.from(createDeferredPointCoordinates({pointCount: 0, sample}))).toEqual([])
  for (const pointCount of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, 0x8000_0000]) {
    expect(() => createDeferredPointCoordinates({pointCount, sample})).toThrow(RangeError)
  }
  expect(sample).not.toHaveBeenCalled()
})

test('should retry a failed point sample without publishing a partially initialized pair', () => {
  const error = new Error('sample failed')
  const sample = vi
    .fn(() => ({x: 1, y: 2}))
    .mockImplementationOnce(() => {
      throw error
    })
  const coordinates = createDeferredPointCoordinates({pointCount: 1, sample})
  expect(() => coordinates[0]).toThrow(error)
  expect(coordinates[1]).toBe(2)
  expect(coordinates[0]).toBe(1)
  expect(sample).toHaveBeenCalledTimes(2)
})
