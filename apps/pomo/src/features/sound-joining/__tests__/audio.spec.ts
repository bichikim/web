import {expect, it} from 'vitest'
import {
  MAX_AI_CONNECTION_SECONDS,
  MIN_AI_CONNECTION_SECONDS,
} from 'src/features/sound-generation/connection'
import {assembleJoin, getJoinParameterError, prepareJoin} from '../audio'
const RATE = 44100
const source = (value: number) => ({
  left: new Float32Array(10 * RATE).fill(value),
  right: new Float32Array(10 * RATE).fill(-value),
})

it('should accept zero trims and inclusive connection duration bounds', () => {
  const parameters = {connectionSeconds: 4, trimEnd: 0, trimStart: 0}

  expect(
    getJoinParameterError({...parameters, connectionSeconds: MIN_AI_CONNECTION_SECONDS}),
  ).toBeNull()
  expect(
    getJoinParameterError({...parameters, connectionSeconds: MAX_AI_CONNECTION_SECONDS}),
  ).toBeNull()
  expect(prepareJoin({...parameters, first: source(0.1), second: source(0.2)}).left.length).toBe(
    20 * RATE,
  )
})

it.each([
  {name: 'non-finite first trim', parameters: {trimEnd: Number.NaN}},
  {name: 'non-finite second trim', parameters: {trimStart: Number.POSITIVE_INFINITY}},
  {name: 'negative first trim', parameters: {trimEnd: -0.1}},
  {name: 'negative second trim', parameters: {trimStart: -0.1}},
  {
    name: 'short connection duration',
    parameters: {connectionSeconds: MIN_AI_CONNECTION_SECONDS - 0.1},
  },
  {
    name: 'long connection duration',
    parameters: {connectionSeconds: MAX_AI_CONNECTION_SECONDS + 0.1},
  },
])('should return an error for a $name', ({parameters}) => {
  expect(
    getJoinParameterError({connectionSeconds: 4, trimEnd: 0, trimStart: 0, ...parameters}),
  ).not.toBeNull()
})
it('should trim both sources and preserve samples outside the replacement region', async () => {
  const plan = prepareJoin({
    connectionSeconds: 4,
    first: source(0.1),
    second: source(0.2),
    trimEnd: 2,
    trimStart: 2,
  })
  expect(plan.left.length).toBe(16 * RATE)
  expect(plan.offset).toBe(2 * RATE)
  const patch = {
    left: new Float32Array(12 * RATE).fill(0.3),
    right: new Float32Array(12 * RATE).fill(-0.3),
  }
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(assembleJoin(plan, patch))
  })
  const data = new DataView(buffer)
  const sample = (second: number, channel: number) =>
    data.getInt16(44 + (second * RATE * 2 + channel) * 2, true)
  expect(sample(1, 0)).toBe(Math.round(0.1 * 32767))
  expect(sample(14, 0)).toBe(Math.round(0.2 * 32767))
  expect(sample(8, 0)).toBe(Math.round(0.3 * 32767))
  expect(sample(8, 1)).toBe(-Math.round(0.3 * 32767))
})
it('should reject cuts leaving insufficient context and invalid connection durations', () => {
  const options = {
    connectionSeconds: 4,
    first: source(0.1),
    second: source(0.2),
    trimEnd: 2,
    trimStart: 2,
  }
  expect(() => prepareJoin({...options, trimEnd: 5})).toThrow('최소 6초')
  expect(() => prepareJoin({...options, trimStart: 5})).toThrow('최소 6초')
  expect(() => prepareJoin({...options, connectionSeconds: Number.NaN})).toThrow('1~10초')
})
