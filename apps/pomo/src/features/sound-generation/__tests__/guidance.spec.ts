/** @vitest-environment node */
import {expect, it} from 'vitest'
import {createClassifierFreeGuidedVelocity, createNegativePromptGuidedVelocity} from '../guidance'

it('should remove the parallel guidance component that amplifies the conditioned sound', () => {
  const velocity = createClassifierFreeGuidedVelocity({
    apgScale: 1,
    cfgScale: 3,
    latent: new Float32Array([10, 10]),
    negativeVelocity: new Float32Array([0, 0]),
    positiveVelocity: new Float32Array([1, 1]),
    timestep: 1,
  })

  expect(Array.from(velocity)).toEqual([1, 1])
})

it('should preserve guidance that is orthogonal to the conditioned sound', () => {
  const velocity = createClassifierFreeGuidedVelocity({
    apgScale: 1,
    cfgScale: 3,
    latent: new Float32Array([10, 10]),
    negativeVelocity: new Float32Array([1, 0]),
    positiveVelocity: new Float32Array([1, 1]),
    timestep: 1,
  })

  expect(Array.from(velocity)).toEqual([0, 2])
})

it('should apply gentle vanilla guidance for browser negative prompts', () => {
  const velocity = createNegativePromptGuidedVelocity({
    latent: new Float32Array([10, 10]),
    negativeVelocity: new Float32Array([0, 0]),
    positiveVelocity: new Float32Array([1, 1]),
    timestep: 1,
  })

  expect(Array.from(velocity)).toEqual([1.5, 1.5])
})

it('should preserve float32 rounding when mixing partially projected guidance', () => {
  const velocity = createClassifierFreeGuidedVelocity({
    apgScale: 0.4,
    cfgScale: 2.2,
    latent: new Float32Array([0.1, -13.3333, 0.000001, 16777216]),
    negativeVelocity: new Float32Array([-0.3, -1.23456, 0.000003, 12344.5]),
    positiveVelocity: new Float32Array([0.2, 2.34567, -0.000002, 12345.5]),
    timestep: 0.42,
  })

  expect(Array.from(new Uint32Array(velocity.buffer))).toEqual([
    1061997773, 1087671002, 3070638013, 1178657544,
  ])
})

it('should return independent results without modifying borrowed input views', () => {
  const samples = new Float32Array([10, 10, 0, 0, 1, 1])
  const options = {
    apgScale: 0,
    cfgScale: 1.5,
    latent: samples.subarray(0, 2),
    negativeVelocity: samples.subarray(2, 4),
    positiveVelocity: samples.subarray(4, 6),
    timestep: 1,
  }
  const first = createClassifierFreeGuidedVelocity(options)
  const second = createClassifierFreeGuidedVelocity(options)

  expect(Array.from(first)).toEqual([1.5, 1.5])
  expect(first.buffer).not.toBe(samples.buffer)
  expect(first.buffer).not.toBe(second.buffer)
  first.fill(0)
  expect(Array.from(second)).toEqual([1.5, 1.5])
  expect(Array.from(samples)).toEqual([10, 10, 0, 0, 1, 1])
})

it('should return an empty result for empty inputs', () => {
  const result = createNegativePromptGuidedVelocity({
    latent: new Float32Array(),
    negativeVelocity: new Float32Array(),
    positiveVelocity: new Float32Array(),
    timestep: 1,
  })

  expect(result).toHaveLength(0)
})

it.each([
  {changedLength: 3, changedRead: 6, expected: [1.5, 1.5, 0], reads: 9},
  {changedLength: 1, changedRead: 6, expected: [1.5], reads: 9},
  {changedLength: 0, changedRead: 7, expected: [0, 0], reads: 7},
  {changedLength: 1, changedRead: 8, expected: [1.5, 0], reads: 8},
])(
  'should preserve output and reads when input length becomes $changedLength on read $changedRead',
  ({changedLength, changedRead, expected, reads}) => {
    const latent = new Float32Array([10, 10])
    let observed = 0
    Object.defineProperty(latent, 'length', {
      get: () => {
        observed += 1
        return observed === changedRead ? changedLength : 2
      },
    })

    const result = createNegativePromptGuidedVelocity({
      latent,
      negativeVelocity: new Float32Array([0, 0]),
      positiveVelocity: new Float32Array([1, 1]),
      timestep: 1,
    })

    expect(Array.from(result)).toEqual(expected)
    expect(observed).toBe(reads)
  },
)

it('should preserve a late output length allocation error', () => {
  const latent = new Float32Array([10, 10])
  let reads = 0
  Object.defineProperty(latent, 'length', {
    get: () => {
      reads += 1
      return reads === 6 ? -1 : 2
    },
  })

  expect(() =>
    createNegativePromptGuidedVelocity({
      latent,
      negativeVelocity: new Float32Array([0, 0]),
      positiveVelocity: new Float32Array([1, 1]),
      timestep: 1,
    }),
  ).toThrow(RangeError)
  expect(reads).toBe(6)
})

it('should propagate a late input length getter failure without replacing its identity', () => {
  const latent = new Float32Array([10, 10])
  const failure = new Error('length unavailable')
  let reads = 0
  Object.defineProperty(latent, 'length', {
    get: () => {
      reads += 1
      if (reads === 6) {
        throw failure
      }
      return 2
    },
  })
  let caught: unknown

  try {
    createNegativePromptGuidedVelocity({
      latent,
      negativeVelocity: new Float32Array([0, 0]),
      positiveVelocity: new Float32Array([1, 1]),
      timestep: 1,
    })
  } catch (error: unknown) {
    caught = error
  }

  expect(caught).toBe(failure)
  expect(reads).toBe(6)
})

it('should retain non-finite results from missing velocity samples', () => {
  const result = createNegativePromptGuidedVelocity({
    latent: new Float32Array([10, 10]),
    negativeVelocity: new Float32Array([0]),
    positiveVelocity: new Float32Array([1]),
    timestep: 1,
  })

  expect(Array.from(result)).toEqual([1.5, Number.NaN])
})
