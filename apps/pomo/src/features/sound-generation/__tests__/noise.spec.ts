import {expect, it} from 'vitest'
import {createNoise, createSeededNoiseSource} from '../noise'

it('should reproduce the same noise sequence for the same seed', () => {
  const first = createNoise(8, createSeededNoiseSource(42))
  const second = createNoise(8, createSeededNoiseSource(42))

  expect(Array.from(first)).toEqual(Array.from(second))
})

it('should continue a noise stream across multiple requests', () => {
  const source = createSeededNoiseSource(42)
  const first = createNoise(4, source)
  const second = createNoise(4, source)
  const complete = createNoise(8, createSeededNoiseSource(42))

  expect(Array.from(new Float32Array([...first, ...second]))).toEqual(Array.from(complete))
})
