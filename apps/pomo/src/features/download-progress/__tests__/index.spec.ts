import {expect, it} from 'vitest'
import {getDownloadPercentage} from '..'

it('should round byte ratios and cap only the upper bound', () => {
  expect(getDownloadPercentage(1, 3)).toBe(33)
  expect(getDownloadPercentage(2, 3)).toBe(67)
  expect(getDownloadPercentage(120, 100)).toBe(100)
  expect(getDownloadPercentage(-1, 10)).toBe(-10)
})

it('should leave unknown total handling to the caller', () => {
  expect(getDownloadPercentage(0, 0)).toBeNaN()
  expect(getDownloadPercentage(1, 0)).toBe(100)
  expect(getDownloadPercentage(1, -10)).toBe(-10)
})
