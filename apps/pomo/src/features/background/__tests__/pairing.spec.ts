/** @vitest-environment node */
import {expect, it} from 'vitest'
import {getPairDirection} from '../pairing'

it('should place portrait photos side by side only if both fit without shrinking', () => {
  const first = {height: 1000, width: 600}
  const second = {height: 1000, width: 800}
  expect(getPairDirection({first, second, viewport: {height: 1000, width: 1400}})).toBe(
    'horizontal',
  )
  expect(getPairDirection({first, second, viewport: {height: 1000, width: 1399}})).toBeNull()
})
it('should stack landscape photos only if both fit without shrinking', () => {
  const first = {height: 600, width: 1000}
  const second = {height: 800, width: 1000}
  expect(getPairDirection({first, second, viewport: {height: 1400, width: 1000}})).toBe('vertical')
  expect(getPairDirection({first, second, viewport: {height: 1399, width: 1000}})).toBeNull()
})
it('should exclude mixed orientations, squares, and invalid dimensions', () => {
  const viewport = {height: 2000, width: 2000}
  expect(
    getPairDirection({
      first: {height: 1000, width: 600},
      second: {height: 600, width: 1000},
      viewport,
    }),
  ).toBeNull()
  expect(
    getPairDirection({
      first: {height: 1000, width: 1000},
      second: {height: 1000, width: 1000},
      viewport,
    }),
  ).toBeNull()
  expect(
    getPairDirection({first: {height: 0, width: 0}, second: {height: 1000, width: 600}, viewport}),
  ).toBeNull()
})
