import {expect, it} from 'vitest'
import {layoutSource, sourceViewport} from '../source-rows'

it('should lay out CR logical lines with their original source offsets', () => {
  const source = 'first\rnext\r'
  expect(layoutSource(source, 20, false).map(({from, to, number}) => [from, to, number])).toEqual([
    [0, 5, 1],
    [6, 10, 2],
    [11, 11, 3],
  ])
})

it('should wrap long logical lines without breaking graphemes or losing source offsets', () => {
  const source = 'ab한🙂éz\r\nnext\n'
  const rows = layoutSource(source, 4, true)
  expect(rows.map((row) => source.slice(row.from, row.to))).toEqual(['ab한', '🙂éz', 'next', ''])
  expect(rows.map((row) => [row.number, row.continuation])).toEqual([
    [1, false],
    [1, true],
    [2, false],
    [3, false],
  ])
  const viewport = sourceViewport(source, rows[1], 0, 4)
  expect(viewport.stops).toEqual([3, 3, 5, 7, 8])
  expect(viewport.segments.map((segment) => segment.text).join('')).toBe('🙂éz')
})

it('should map tabs and horizontal clipping to the original character positions', () => {
  const source = 'a\t한글z'
  const [row] = layoutSource(source, 4, false)
  const viewport = sourceViewport(source, row, 2, 5)
  expect(viewport.segments.map((segment) => segment.text).join('')).toBe('  한글')
  expect(viewport.stops).toEqual([1, 1, 2, 2, 3, 3])
  expect(viewport.from).toBe(0)
  expect(viewport.to).toBe(source.length)
})

it('should retain empty lines and put exact-width line endings on the same row', () => {
  const source = '1234\n\n5678'
  expect(layoutSource(source, 4, true).map(({from, to}) => [from, to])).toEqual([
    [0, 4],
    [5, 5],
    [6, 10],
  ])
})
it('should reserve two cells for flags and keycap emoji without splitting their clusters', () => {
  const source = '🇰🇷1️⃣x'
  expect(layoutSource(source, 2, true).map((row) => source.slice(row.from, row.to))).toEqual([
    '🇰🇷',
    '1️⃣',
    'x',
  ])
})
