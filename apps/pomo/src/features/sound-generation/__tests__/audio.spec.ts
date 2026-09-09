import {expect, it} from 'vitest'
import {createSchedule, createStereoWave} from '../audio'

it('should reproduce the official eight step LogSNR schedule endpoints and midpoint', () => {
  const schedule = createSchedule(8)
  expect(schedule).toHaveLength(9)
  expect(schedule[0]).toBe(1)
  expect(schedule[8]).toBe(0)
  expect(schedule[4]).toBeCloseTo(1 / (1 + Math.exp(-2.1)), 6)
  expect(schedule.every((value, index) => index === 0 || value < schedule[index - 1])).toBe(true)
})

it('should encode interleaved stereo PCM and trim padding to the requested duration', async () => {
  const blob = createStereoWave(new Int32Array([40000, -40000, 123, -123, 9, 9]), 2)
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(blob)
  })
  const view = new DataView(buffer)
  expect(view.byteLength).toBe(52)
  expect(view.getUint16(22, true)).toBe(2)
  expect(view.getUint32(24, true)).toBe(44100)
  expect(view.getInt16(44, true)).toBe(32767)
  expect(view.getInt16(46, true)).toBe(-32768)
  expect(view.getInt16(48, true)).toBe(123)
})
