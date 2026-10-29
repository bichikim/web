import {expect, expectTypeOf, it} from 'vitest'
import {remapOccurrences} from '..'

it('should match repeated keys in source order while following target order', () => {
  expect(
    remapOccurrences({
      sourceKeys: ['one', 'two', 'one'],
      targetKeys: ['two', 'one', 'one', 'one'],
      values: ['first', 'middle', 'last'],
    }),
  ).toEqual(['middle', 'first', 'last', undefined])
})

it('should mark unknown targets without consuming other keys', () => {
  expect(
    remapOccurrences({
      sourceKeys: ['one', 'one'],
      targetKeys: ['missing', 'one', 'missing', 'one'],
      values: [1, 2],
    }),
  ).toEqual([undefined, 1, undefined, 2])
})

it('should skip missing values without consuming an occurrence', () => {
  expect(
    remapOccurrences({
      sourceKeys: ['one', 'one', 'one'],
      targetKeys: ['one', 'one', 'one'],
      values: [undefined, 'present'],
    }),
  ).toEqual(['present', undefined, undefined])
})

it('should ignore values beyond the source keys', () => {
  expect(
    remapOccurrences({sourceKeys: ['one'], targetKeys: ['one', 'one'], values: [1, 2]}),
  ).toEqual([1, undefined])
})

it('should retain null and falsy values as separate occurrences', () => {
  expect(
    remapOccurrences({
      sourceKeys: ['one', 'one', 'one', 'one'],
      targetKeys: ['one', 'one', 'one', 'one'],
      values: [null, false, 0, ''],
    }),
  ).toEqual([null, false, 0, ''])
})

it('should preserve object identity and leave all input arrays unchanged', () => {
  const first: Readonly<{value: number}> = Object.freeze({value: 1})
  const second: Readonly<{value: number}> = Object.freeze({value: 2})
  const sourceKeys = Object.freeze(['one', 'one'])
  const values = Object.freeze([first, second])
  const targetKeys = Object.freeze(['one', 'one'])
  const result = remapOccurrences({sourceKeys, targetKeys, values})
  expectTypeOf(result).toEqualTypeOf<ReadonlyArray<Readonly<{value: number}> | undefined>>()
  expect(result[0]).toBe(first)
  expect(result[1]).toBe(second)
  expect(values).toEqual([first, second])
  expect(sourceKeys).toEqual(['one', 'one'])
  expect(targetKeys).toEqual(['one', 'one'])
})

it('should keep repeated calls independent', () => {
  const options = {sourceKeys: ['one'], targetKeys: ['one'], values: [1]}
  expect(remapOccurrences(options)).toEqual([1])
  expect(remapOccurrences(options)).toEqual([1])
})

it('should return empty output for no targets', () => {
  expect(remapOccurrences({sourceKeys: ['one'], targetKeys: [], values: [1]})).toEqual([])
})

it('should mark every target when there are no source keys', () => {
  expect(remapOccurrences({sourceKeys: [], targetKeys: ['one', 'one'], values: []})).toEqual([
    undefined,
    undefined,
  ])
})

it('should skip sparse source keys and values while preserving sparse targets', () => {
  const sourceKeys = ['one', 'ignored', 'one', 'one']
  const values = ['first', 'ignored', 'missing', 'last']
  const targetKeys = ['one', 'ignored', 'one', 'one']
  delete sourceKeys[1]
  delete values[2]
  delete targetKeys[1]
  const result = remapOccurrences({sourceKeys, targetKeys, values})
  const expected = ['first', undefined, 'last', undefined]
  delete expected[1]
  expect(result).toEqual(expected)
  expect(1 in result).toBe(false)
  expect(3 in result).toBe(true)
})
