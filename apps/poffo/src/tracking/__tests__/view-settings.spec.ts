import {expect, test} from 'vitest'
import {isRuntimeView} from '../view-settings'
test('should accept finite camera coordinates and reject invalid saved view settings', () => {
  expect(isRuntimeView({camera: {x: -120, y: 80, zoom: 0.75}, fitted: false})).toBe(true)
  expect(isRuntimeView({camera: {x: NaN, y: 0, zoom: 1}, fitted: false})).toBe(false)
  expect(isRuntimeView({camera: {x: 0, y: 0, zoom: 0}, fitted: false})).toBe(false)
  expect(isRuntimeView({camera: {x: 0, y: 0, zoom: 1}, fitted: 'yes'})).toBe(false)
})
