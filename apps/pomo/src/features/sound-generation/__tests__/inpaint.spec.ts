import {expect, it} from 'vitest'
import {createInpaintCondition, restoreInpaintContext, validateInpaint} from '../inpaint'
it('should put preservation mask before 256 context channels and clear only the masked region', () => {
  const length = 100
  const output = createInpaintCondition(new Float32Array(256 * length).fill(0.5), length, 3, 5)
  expect(output[0]).toBe(1)
  expect(output[40]).toBe(0)
  expect(output[99]).toBe(1)
  expect(output[length]).toBe(0.5)
  expect(output[length + 40]).toBe(0)
  expect(output[256 * length + 99]).toBe(0.5)
})
it('should reject mismatched input lengths and invalid encoder values', () => {
  expect(() =>
    validateInpaint({end: 1, left: new Float32Array(1), right: new Float32Array(1), start: 0}, 1),
  ).toThrow()
  expect(() => createInpaintCondition(new Float32Array(256).fill(Number.NaN), 1, 0, 1)).toThrow()
})

it('should restore every preserved channel after sampling without replacing the generated gap', () => {
  const length = 100
  const original = Float32Array.from({length: 256 * length}, (_, index) => index / 100)
  const condition = createInpaintCondition(original, length, 3, 5)
  const sampled = new Float32Array(256 * length).fill(-2)
  restoreInpaintContext(sampled, condition, length)
  for (let channel = 0; channel < 256; channel += 1) {
    expect(sampled[channel * length]).toBe(original[channel * length])
    expect(sampled[channel * length + 40]).toBe(-2)
    expect(sampled[channel * length + 99]).toBe(original[channel * length + 99])
  }
})
it('should leave text-to-sound sampling unchanged with empty conditioning', () => {
  const sampled = new Float32Array(256).fill(0.25)
  restoreInpaintContext(sampled, new Float32Array(257), 1)
  expect([...sampled]).toEqual(new Array(256).fill(0.25))
})
