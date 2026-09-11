import {expect, it} from 'vitest'
import {assembleJoin, prepareJoin} from '../audio'
const RATE = 44100
const source = (value: number) => ({
  left: new Float32Array(10 * RATE).fill(value),
  right: new Float32Array(10 * RATE).fill(-value),
})
it('should trim both sources and preserve samples outside the replacement region', async () => {
  const plan = prepareJoin({
    first: source(0.1),
    second: source(0.2),
    transition: 4,
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
it('should reject cuts leaving insufficient context and invalid transitions', () => {
  const options = {first: source(0.1), second: source(0.2), transition: 4, trimEnd: 2, trimStart: 2}
  expect(() => prepareJoin({...options, trimEnd: 5})).toThrow('최소 6초')
  expect(() => prepareJoin({...options, transition: Number.NaN})).toThrow('1~8초')
})
