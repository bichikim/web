import {expect, test} from 'vitest'
import {cursorResponse} from '../cursor-response'

test('should preserve the nearby atan response while reaching the exact maximum at one character height', () => {
  for (const distance of [0.05, 0.125, 0.25]) {
    const original = Math.atan(distance / 0.3) / (Math.PI / 2)
    expect(Math.abs(cursorResponse(distance) / original - 1)).toBeLessThan(0.03)
  }
  expect(cursorResponse(0)).toBe(0)
  expect(cursorResponse(1)).toBe(1)
  expect(cursorResponse(2)).toBe(1)
  expect(1 - cursorResponse(0.999)).toBeLessThan(0.000002)
})

test('should increase continuously with diminishing increments and remain within the normalized range', () => {
  let previous = 0
  let previousStep = Infinity
  for (let index = 1; index <= 1000; index += 1) {
    const value = cursorResponse(index / 1000)
    const step = value - previous
    expect(value).toBeLessThanOrEqual(1)
    expect(step).toBeGreaterThan(0)
    expect(step).toBeLessThanOrEqual(previousStep)
    previous = value
    previousStep = step
  }
  expect(cursorResponse(-1)).toBe(0)
  expect(cursorResponse(Number.NaN)).toBe(0)
})
